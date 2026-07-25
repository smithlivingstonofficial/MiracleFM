"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type UserAuthContextType = {
  user: User | null;
  likedTrackIds: Set<string>;
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string) => Promise<boolean>;
};

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  likedTrackIds: new Set(),
  isLiked: () => false,
  toggleLike: async () => false,
});

export function UserAuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function initUserAndLikes() {
      const currentUser = initialUser;
      if (!currentUser) {
        // Double check browser session once
        const { data: { user: sessionUser } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(sessionUser);
        if (!sessionUser) {
          setLikedTrackIds(new Set());
          return;
        }
      }

      const activeUser = currentUser || user;
      if (!activeUser) return;

      // Fetch user liked track IDs ONCE for the whole app session
      const { data } = await supabase
        .from("user_likes")
        .select("track_id")
        .eq("user_id", activeUser.id);

      if (cancelled) return;
      if (data) {
        setLikedTrackIds(new Set(data.map((row: { track_id: string }) => row.track_id)));
      }
    }

    initUserAndLikes();

    return () => {
      cancelled = true;
    };
  }, [initialUser, supabase]);

  const isLiked = useCallback(
    (trackId: string) => likedTrackIds.has(trackId),
    [likedTrackIds]
  );

  const toggleLike = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!user) return false;

      const currentlyLiked = likedTrackIds.has(trackId);
      const nextSet = new Set(likedTrackIds);

      if (currentlyLiked) {
        nextSet.delete(trackId);
        setLikedTrackIds(nextSet);

        const { error } = await supabase
          .from("user_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("track_id", trackId);

        if (error) {
          // Revert on error
          nextSet.add(trackId);
          setLikedTrackIds(new Set(nextSet));
          return false;
        }
        return true;
      } else {
        nextSet.add(trackId);
        setLikedTrackIds(nextSet);

        const { error } = await supabase
          .from("user_likes")
          .insert({ user_id: user.id, track_id: trackId });

        if (error && error.code !== "23505") {
          // Revert on error
          nextSet.delete(trackId);
          setLikedTrackIds(new Set(nextSet));
          return false;
        }
        return true;
      }
    },
    [user, likedTrackIds, supabase]
  );

  return (
    <UserAuthContext.Provider value={{ user, likedTrackIds, isLiked, toggleLike }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(UserAuthContext);
}
