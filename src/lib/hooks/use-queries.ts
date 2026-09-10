"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExecutives,
  getShops,
  getShopMappings,
  getShopCollections,
  getExecutiveCollections,
  getUploadBatches,
  addExecutive,
  addShopWithExecutive,
  bulkAddShopsWithExecutive,
  updateShopExecutive,
  deleteShop,
  deleteUploadBatch,
  updateUploadBatchFileName,
  saveParsedCollectionsToDb,
} from "@/lib/supabase/collections-service";
import { ShopCollection } from "@/types";

export const QUERY_KEYS = {
  executives: ["executives"] as const,
  shops: ["shops"] as const,
  shopMappings: ["shop_mappings"] as const,
  shopCollections: ["shop_collections"] as const,
  uploadBatches: ["upload_batches"] as const,
  executiveCollections: (name: string) => ["executive_collections", name.toLowerCase()] as const,
};

// ----------------------------------------------------------------------
// Queries (With 5-min staleTime and memory caching)
// ----------------------------------------------------------------------

export function useExecutives() {
  return useQuery({
    queryKey: QUERY_KEYS.executives,
    queryFn: getExecutives,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShops() {
  return useQuery({
    queryKey: QUERY_KEYS.shops,
    queryFn: getShops,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShopMappings() {
  return useQuery({
    queryKey: QUERY_KEYS.shopMappings,
    queryFn: getShopMappings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShopCollections() {
  return useQuery({
    queryKey: QUERY_KEYS.shopCollections,
    queryFn: getShopCollections,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadBatches() {
  return useQuery({
    queryKey: QUERY_KEYS.uploadBatches,
    queryFn: getUploadBatches,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExecutiveCollections(execName: string) {
  return useQuery({
    queryKey: QUERY_KEYS.executiveCollections(execName),
    queryFn: () => getExecutiveCollections(execName),
    enabled: Boolean(execName),
    staleTime: 5 * 60 * 1000,
  });
}

// ----------------------------------------------------------------------
// Mutations (Automatically invalidates relevant queries)
// ----------------------------------------------------------------------

export function useAddExecutiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => addExecutive(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.executives });
    },
  });
}

export function useAddShopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, executiveName }: { name: string; executiveName?: string }) =>
      addShopWithExecutive(name, executiveName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useBulkAddShopsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names, executiveName }: { names: string[]; executiveName?: string }) =>
      bulkAddShopsWithExecutive(names, executiveName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useUpdateShopExecutiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopId,
      shopName,
      executiveName,
    }: {
      shopId: string;
      shopName: string;
      executiveName: string;
    }) => updateShopExecutive(shopId, shopName, executiveName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useDeleteUploadBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => deleteUploadBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
    },
  });
}

export function useSaveCollectionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileName, collections }: { fileName: string; collections: ShopCollection[] }) =>
      saveParsedCollectionsToDb(fileName, collections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
    },
  });
}

export function useDeleteShopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shopId: string) => deleteShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useUpdateUploadBatchFileNameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, newFileName }: { batchId: string; newFileName: string }) =>
      updateUploadBatchFileName(batchId, newFileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadBatches });
    },
  });
}
