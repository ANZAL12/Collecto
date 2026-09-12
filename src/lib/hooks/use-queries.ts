"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExecutives,
  getShops,
  getShopMappings,
  getShopCollections,
  getExecutiveCollections,
  getUploadBatches,
  getCompanies,
  addCompany,
  deleteCompany,
  addExecutive,
  addShopWithExecutive,
  bulkAddShopsWithExecutive,
  updateShopExecutive,
  deleteShop,
  deleteAllShops,
  deleteUploadBatch,
  updateUploadBatchFileName,
  saveParsedCollectionsToDb,
  toggleInvoicePaymentStatus,
  updateExecutiveCredentials,
  deleteExecutive,
} from "@/lib/supabase/collections-service";
import { ShopCollection, Shop, ShopMapping } from "@/types";

export const QUERY_KEYS = {
  executives: ["executives"] as const,
  shops: ["shops"] as const,
  companies: ["companies"] as const,
  shopMappings: ["shop_mappings"] as const,
  shopCollections: ["shop_collections"] as const,
  uploadBatches: ["upload_batches"] as const,
  executiveCollections: (name: string) => ["executive_collections", name.toLowerCase()] as const,
};

// ----------------------------------------------------------------------
// Queries (With 5-min staleTime and memory caching)
// ----------------------------------------------------------------------

export function useCompanies() {
  return useQuery({
    queryKey: QUERY_KEYS.companies,
    queryFn: getCompanies,
    staleTime: 5 * 60 * 1000,
  });
}

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
    mutationFn: (data: { name: string; username?: string; password?: string } | string) => {
      if (typeof data === "string") return addExecutive(data);
      return addExecutive(data.name, data.username, data.password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.executives });
    },
  });
}

export function useUpdateExecutiveCredentialsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, username, password, oldPassword }: { name: string; username: string; password: string; oldPassword?: string }) =>
      updateExecutiveCredentials(name, username, password, oldPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.executives });
    },
  });
}

export function useDeleteExecutiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      deleteExecutive(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.executives });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      queryClient.invalidateQueries({ queryKey: ["executive_collections"] });
    },
  });
}

export function useAddShopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      executiveName,
      companyId,
      companyName,
    }: {
      name: string;
      executiveName?: string;
      companyId?: string;
      companyName?: string;
    }) => addShopWithExecutive(name, executiveName, companyId, companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
    },
  });
}

export function useBulkAddShopsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      names,
      executiveName,
      companyId,
      companyName,
    }: {
      names: string[];
      executiveName?: string;
      companyId?: string;
      companyName?: string;
    }) => bulkAddShopsWithExecutive(names, executiveName, companyId, companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
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
      companyId,
      companyName,
    }: {
      shopId: string;
      shopName: string;
      executiveName: string;
      companyId?: string;
      companyName?: string;
    }) => updateShopExecutive(shopId, shopName, executiveName, companyId, companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useAddCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, code }: { name: string; code?: string }) => addCompany(name, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
    },
  });
}

export function useDeleteCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
    },
  });
}

export function useSaveCollectionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileName,
      collections,
      companyId,
      companyName,
    }: {
      fileName: string;
      collections: ShopCollection[];
      companyId?: string;
      companyName?: string;
    }) => saveParsedCollectionsToDb(fileName, collections, companyId, companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      queryClient.invalidateQueries({ queryKey: ["executive_collections"] });
    },
  });
}

export function useDeleteAllShopsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllShops(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shops });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopMappings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      queryClient.invalidateQueries({ queryKey: ["executive_collections"] });
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

export interface ExecutivePortalData {
  collections: ShopCollection[];
  shops: Shop[];
  mappings: ShopMapping[];
  companies: string[];
}

export async function fetchExecutivePortalData(executiveName: string): Promise<ExecutivePortalData> {
  if (!executiveName) {
    return { collections: [], shops: [], mappings: [], companies: [] };
  }
  const res = await fetch(`/api/executive/data?executiveName=${encodeURIComponent(executiveName)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch executive data");
  }
  const json = await res.json();
  return {
    collections: json.collections || [],
    shops: json.shops || [],
    mappings: json.mappings || [],
    companies: json.companies || [],
  };
}

export function useExecutivePortalData(executiveName: string) {
  return useQuery({
    queryKey: QUERY_KEYS.executiveCollections(executiveName),
    queryFn: () => fetchExecutivePortalData(executiveName),
    enabled: Boolean(executiveName),
    staleTime: 60 * 1000,
  });
}

export function useTogglePaymentStatusMutation(activeExecutive?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      isPaid,
      executiveName,
    }: {
      invoiceId: string;
      isPaid: boolean;
      executiveName?: string;
    }) => {
      try {
        await fetch("/api/executive/toggle-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId,
            isPaid,
            executiveName: executiveName || activeExecutive,
          }),
        });
      } catch (err) {
        console.warn("API toggle error, falling back to direct service:", err);
      }
      return toggleInvoicePaymentStatus(invoiceId, isPaid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopCollections });
      if (activeExecutive) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.executiveCollections(activeExecutive),
        });
      }
    },
  });
}
