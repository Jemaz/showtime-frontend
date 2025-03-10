import useSWR from "swr";

import { GatingType, IEdition } from "app/types";

import { fetcher } from "./use-infinite-list-query";

export type CreatorEditionResponse = {
  creator_airdrop_edition: IEdition;
  is_already_claimed: boolean;
  password: string | null;
  time_limit: string;
  total_claimed_count: number;
  gating_type: GatingType;
  spotify_track_name: string | null;
  spotify_track_url: string | null;
  spinamp_track_url: string | null; // this will be removed after the airdrop
  presave_release_date: string | null;
};

export function useCreatorCollectionDetail(editionAddress?: string) {
  const { data, error, mutate } = useSWR<CreatorEditionResponse>(
    editionAddress
      ? "/v1/creator-airdrops/edition?edition_address=" + editionAddress
      : null,
    fetcher
  );

  return {
    data,
    loading: !data,
    error,
    mutate,
  };
}
