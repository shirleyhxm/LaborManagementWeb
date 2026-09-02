import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { AlertCircle, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { contractService } from "../services/contractService";
import {
  CONTRACT_FILE_ACCEPT,
  MAX_CONTRACT_SIZE_BYTES,
  formatFileSize,
  type EmployeeContract,
} from "../types/contract";
import type { Employee } from "../types/employee";

interface EmployeeContractsProps {
  employee: Employee;
  /**
   * Whether this is looking at the employee from somewhere other than their
   * home location. Contracts are managed by the home location only, so a
   * borrowed record gets an explanation instead of a file list.
   */
  isBorrowed: boolean;
  /**
   * Id put on the opening paragraph so a containing dialog can point its
   * aria-describedby at it, rather than repeating the same sentence in a
   * header description.
   */
  introId?: string;
}

/**
 * An employee's contract documents.
 *
 * Lives in its own dialog off the roster card rather than in the edit dialog:
 * uploading and deleting are each their own operation that takes effect
 * immediately, so they have nothing to do with that dialog's Save, and sitting
 * beside fields that only apply on save made the difference easy to misread.
 */
export function EmployeeContracts({ employee, isBorrowed, introId }: EmployeeContractsProps) {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Tracked per-row so one document's spinner does not freeze the whole list.
  const [busyContractId, setBusyContractId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The home location owns the documents; there is nothing to fetch from
    // anywhere else, and the request would 404.
    if (isBorrowed) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    contractService
      .getContracts(employee.businessId, employee.id)
      .then((result) => {
        if (!cancelled) setContracts(result.contracts ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load contracts");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee.id, employee.businessId, isBorrowed]);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failed attempt.
    event.target.value = "";
    if (!file) return;

    // Checked here as well as on the backend so an oversized file fails
    // instantly rather than after uploading megabytes to be rejected.
    if (file.size > MAX_CONTRACT_SIZE_BYTES) {
      setError(`"${file.name}" is larger than ${formatFileSize(MAX_CONTRACT_SIZE_BYTES)}.`);
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const created = await contractService.uploadContract(
        employee.businessId,
        employee.id,
        file
      );
      // Newest first, matching the order the backend returns.
      setContracts((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload contract");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (contract: EmployeeContract) => {
    setBusyContractId(contract.id);
    setError(null);
    try {
      await contractService.downloadContract(
        employee.businessId,
        employee.id,
        contract.id,
        contract.fileName
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download contract");
    } finally {
      setBusyContractId(null);
    }
  };

  const handleDelete = async (contract: EmployeeContract) => {
    setBusyContractId(contract.id);
    setError(null);
    try {
      await contractService.deleteContract(employee.businessId, employee.id, contract.id);
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contract");
    } finally {
      setBusyContractId(null);
    }
  };

  if (isBorrowed) {
    return (
      <Alert className="bg-amber-50 border-amber-200 text-amber-700">
        <AlertCircle className="h-4 w-4" />
        {/* Carries introId in this branch too - it is the only text here, so
            without it a containing dialog's aria-describedby would dangle. */}
        <AlertDescription id={introId}>
          {employee.firstName}'s contracts are held by their home location, and can only be
          managed from there.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    // gap-3 rather than gap-4: with the rows below trimmed to the few that
    // carry information, a tighter rhythm keeps the dialog from looking padded.
    <div className="grid gap-3">
      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Intro and the action share a line. The intro wraps to two lines at
          this width, which is the same height as the button beside it, so the
          pair costs one row instead of two. */}
      <div className="flex items-start justify-between gap-4">
        <p id={introId} className="text-sm text-neutral-600">
          Signed contracts and related paperwork. {employee.firstName} can view and download
          these from their own portal.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-1" />
          )}
          Add contract
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={CONTRACT_FILE_ACCEPT}
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading contracts…
        </div>
      ) : contracts.length === 0 ? (
        // The empty state absorbs the format hint rather than leaving it as a
        // separate line - with no files listed there is room for it here, and
        // it is exactly when someone needs to know what they can upload.
        <div className="text-center py-6 text-neutral-500 border border-dashed border-neutral-300 rounded-md">
          <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-20" />
          <p className="text-sm">No contracts uploaded</p>
          <p className="text-xs mt-0.5">
            PDF, Word or image, up to {formatFileSize(MAX_CONTRACT_SIZE_BYTES)}.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-md">
          {contracts.map((contract) => (
            <div key={contract.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 truncate">{contract.fileName}</p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(contract.sizeBytes)} · Uploaded{" "}
                  {new Date(contract.uploadedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex-shrink-0"
                aria-label={`Download ${contract.fileName}`}
                title="Download"
                onClick={() => handleDownload(contract)}
                disabled={busyContractId === contract.id}
              >
                {busyContractId === contract.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`Delete ${contract.fileName}`}
                title="Delete"
                onClick={() => handleDelete(contract)}
                disabled={busyContractId === contract.id}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
