"use client";

import * as React from "react";
import { ExcelValidationResult } from "@/lib/excel-parser";
import { Company } from "@/types";

interface UploadDraftState {
  validationResult: ExcelValidationResult | null;
  draftFile: File | null;
  activeParser: "parser1" | "parser2";
  selectedCompany: Company | null;
  showWarningsOnly: boolean;
  isCommitted: boolean;
  hasDraft: boolean;
}

interface UploadDraftContextType extends UploadDraftState {
  setValidationResult: React.Dispatch<React.SetStateAction<ExcelValidationResult | null>>;
  setDraftFile: (file: File | null) => void;
  setActiveParser: (parser: "parser1" | "parser2") => void;
  setSelectedCompany: (company: Company | null) => void;
  setShowWarningsOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommitted: (val: boolean) => void;
  updateShopExecutive: (shopId: string, newExecutiveName: string | undefined) => void;
  deleteShopCollection: (shopId: string) => void;
  deleteMultipleShopCollections: (shopIds: string[]) => void;
  deleteCollectionItem: (shopId: string, itemIndex: number) => void;
  clearDraft: () => void;
}

const UploadDraftContext = React.createContext<UploadDraftContextType | null>(null);

const SESSION_STORAGE_KEY = "collecto_upload_preview_draft_v1";

export function UploadDraftProvider({ children }: { children: React.ReactNode }) {
  const [validationResult, setValidationResult] = React.useState<ExcelValidationResult | null>(null);
  const [draftFile, setDraftFile] = React.useState<File | null>(null);
  const [activeParser, setActiveParser] = React.useState<"parser1" | "parser2">("parser1");
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [showWarningsOnly, setShowWarningsOnly] = React.useState(false);
  const [isCommitted, setIsCommitted] = React.useState(false);
  const isHydratedRef = React.useRef(false);

  // 1. Restore draft from sessionStorage on initial client mount
  React.useEffect(() => {
    if (typeof window === "undefined" || isHydratedRef.current) return;
    isHydratedRef.current = true;

    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.validationResult && !parsed.isCommitted) {
          setValidationResult(parsed.validationResult);
          if (parsed.activeParser) setActiveParser(parsed.activeParser);
          if (parsed.selectedCompany) setSelectedCompany(parsed.selectedCompany);
          if (typeof parsed.showWarningsOnly === "boolean") setShowWarningsOnly(parsed.showWarningsOnly);
        }
      }
    } catch (e) {
      console.warn("Failed to restore upload draft preview from sessionStorage:", e);
    }
  }, []);

  // 2. Persist draft to sessionStorage on state changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !isHydratedRef.current) return;

    try {
      if (validationResult && validationResult.collections?.length > 0 && !isCommitted) {
        const payload = {
          validationResult,
          activeParser,
          selectedCompany,
          showWarningsOnly,
          isCommitted: false,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
      } else if (!validationResult || isCommitted) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist upload draft preview to sessionStorage:", e);
    }
  }, [validationResult, activeParser, selectedCompany, showWarningsOnly, isCommitted]);

  // Update executive mapping for a shop and update warningRows counter
  const updateShopExecutive = React.useCallback(
    (shopId: string, newExecutiveName: string | undefined) => {
      setValidationResult((prev) => {
        if (!prev) return prev;
        const updatedCollections = prev.collections.map((col) => {
          if (col.id === shopId) {
            return {
              ...col,
              executiveName: newExecutiveName,
              status: (newExecutiveName ? "mapped" : "unmapped") as "mapped" | "unmapped",
            };
          }
          return col;
        });

        const newWarningCount = updatedCollections.filter(
          (c) => !c.executiveName || c.status === "unmapped"
        ).length;

        return {
          ...prev,
          collections: updatedCollections,
          warningRows: newWarningCount,
        };
      });
    },
    []
  );

  const deleteShopCollection = React.useCallback((shopId: string) => {
    setValidationResult((prev) => {
      if (!prev) return prev;
      const updatedCollections = prev.collections.filter(
        (col) => col.id !== shopId && `${col.shopName}_${col.invoiceNo}` !== shopId
      );

      const newTotalItems = updatedCollections.reduce(
        (sum, c) => sum + (c.items?.length || 0),
        0
      );
      const newWarningCount = updatedCollections.filter(
        (c) => !c.executiveName || c.status === "unmapped"
      ).length;

      return {
        ...prev,
        collections: updatedCollections,
        groupedShops: updatedCollections,
        totalShops: updatedCollections.length,
        totalItems: newTotalItems,
        validRows: updatedCollections.length,
        totalRows: updatedCollections.length,
        warningRows: newWarningCount,
      };
    });
  }, []);

  const deleteMultipleShopCollections = React.useCallback((shopIds: string[]) => {
    const idSet = new Set(shopIds);
    setValidationResult((prev) => {
      if (!prev) return prev;
      const updatedCollections = prev.collections.filter(
        (col) => !idSet.has(col.id) && !idSet.has(`${col.shopName}_${col.invoiceNo}`)
      );

      const newTotalItems = updatedCollections.reduce(
        (sum, c) => sum + (c.items?.length || 0),
        0
      );
      const newWarningCount = updatedCollections.filter(
        (c) => !c.executiveName || c.status === "unmapped"
      ).length;

      return {
        ...prev,
        collections: updatedCollections,
        groupedShops: updatedCollections,
        totalShops: updatedCollections.length,
        totalItems: newTotalItems,
        validRows: updatedCollections.length,
        totalRows: updatedCollections.length,
        warningRows: newWarningCount,
      };
    });
  }, []);

  const deleteCollectionItem = React.useCallback(
    (shopId: string, itemIndex: number) => {
      setValidationResult((prev) => {
        if (!prev) return prev;
        const updatedCollections = prev.collections.map((col) => {
          if (col.id === shopId || `${col.shopName}_${col.invoiceNo}` === shopId) {
            const updatedItems = col.items.filter((_, idx) => idx !== itemIndex);
            const newTotalAmount = updatedItems.reduce(
              (sum, it) => sum + (Number(it.amount) || 0),
              0
            );
            return {
              ...col,
              items: updatedItems,
              totalAmount: newTotalAmount,
            };
          }
          return col;
        });

        const newTotalItems = updatedCollections.reduce(
          (sum, c) => sum + (c.items?.length || 0),
          0
        );

        return {
          ...prev,
          collections: updatedCollections,
          groupedShops: updatedCollections,
          totalItems: newTotalItems,
        };
      });
    },
    []
  );

  const clearDraft = React.useCallback(() => {
    setValidationResult(null);
    setDraftFile(null);
    setIsCommitted(false);
    setShowWarningsOnly(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {}
  }, []);

  const hasDraft = Boolean(
    validationResult &&
      validationResult.collections &&
      validationResult.collections.length > 0 &&
      !isCommitted
  );

  return (
    <UploadDraftContext.Provider
      value={{
        validationResult,
        setValidationResult,
        draftFile,
        setDraftFile,
        activeParser,
        setActiveParser,
        selectedCompany,
        setSelectedCompany,
        showWarningsOnly,
        setShowWarningsOnly,
        isCommitted,
        setIsCommitted,
        updateShopExecutive,
        deleteShopCollection,
        deleteMultipleShopCollections,
        deleteCollectionItem,
        clearDraft,
        hasDraft,
      }}
    >
      {children}
    </UploadDraftContext.Provider>
  );
}

export function useUploadDraft() {
  const ctx = React.useContext(UploadDraftContext);
  if (!ctx) {
    throw new Error("useUploadDraft must be used within an UploadDraftProvider");
  }
  return ctx;
}
