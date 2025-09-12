"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, Plus, History, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

interface iManageFile {
  id: string;
  name: string;
  type: 'folder' | 'file';
  modifiedDate: string;
  size?: string;
  path: string;
}

interface iManageFilePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected?: (files: iManageFile[]) => void;
  overlayClassName?: string;
}

// Helper function to get file icon based on extension
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return '/pdf-icon.svg';
    case 'docx':
    case 'doc':
      return '/docx-icon.svg';
    case 'xlsx':
    case 'xls':
      return '/xlsx-icon.svg';
    case 'txt':
    default:
      return '/file.svg';
  }
};

// Define columns once, outside of component
const columns: ColumnDef<iManageFile>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          disabled={!row.getCanSelect()}
        />
      </div>
    ),
    size: 24,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.type === 'folder' ? (
          <Image 
            src="/folderIcon.svg" 
            alt="Folder" 
            width={16} 
            height={16} 
            className="flex-shrink-0" 
          />
        ) : (
          <Image 
            src={getFileIcon(row.original.name)} 
            alt="File" 
            width={16} 
            height={16} 
            className="flex-shrink-0" 
          />
        )}
        <div className="min-w-0">
          <p className="text-sm text-neutral-900 truncate">{row.original.name}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ getValue }) => (
      <span className="text-sm text-neutral-600">{(getValue() as string) || '-'}</span>
    ),
  },
];

// Mock data - define once
const mockFiles: iManageFile[] = [
  { id: '1', name: 'Acme Corporation', type: 'folder', modifiedDate: '2024-01-15', path: 'My Matters/Acme Corporation' },
  { id: '2', name: 'GlobalTech Inc', type: 'folder', modifiedDate: '2024-01-10', path: 'My Matters/GlobalTech Inc' },
  { id: '3', name: 'Litigation', type: 'folder', modifiedDate: '2024-01-12', path: 'My Matters/Litigation' },
  { id: '4', name: 'Echabarrai v. PPG Indus - Scheduling Order.pdf', type: 'file', modifiedDate: '2024-01-14', size: '1.2 MB', path: 'My Matters/Litigation/Echabarrai' },
  { id: '5', name: 'Schnupp v. Blair Pharmacy - Opinion.pdf', type: 'file', modifiedDate: '2024-01-13', size: '3.4 MB', path: 'My Matters/Litigation/Schnupp' },
  { id: '6', name: 'Unicorn Capital _ Nkomati claims management.docx', type: 'file', modifiedDate: '2024-01-12', size: '856 KB', path: 'My Matters/Unicorn Capital' },
  { id: '7', name: 'C05763098.pdf', type: 'file', modifiedDate: '2024-01-11', size: '2.1 MB', path: 'My Matters/GlobalTech Inc/Documents' },
  { id: '8', name: 'Contract_Draft_v3.docx', type: 'file', modifiedDate: '2024-01-14', size: '2.3 MB', path: 'My Matters/Acme Corporation/Contracts' },
  { id: '9', name: 'Due_Diligence_Report.pdf', type: 'file', modifiedDate: '2024-01-12', size: '5.1 MB', path: 'My Matters/GlobalTech Inc/Due Diligence' },
  { id: '10', name: 'Meeting_Notes_Jan.docx', type: 'file', modifiedDate: '2024-01-08', size: '345 KB', path: 'My Matters/Acme Corporation/Notes' },
  { id: '11', name: 'ValarAI_Series_F_Financing.pdf', type: 'file', modifiedDate: '2024-11-28', size: '4.8 MB', path: 'My Matters/ValarAI/Financing' },
  { id: '17', name: 'ValarAI_Business_Plan_2024.pdf', type: 'file', modifiedDate: '2024-11-25', size: '3.2 MB', path: 'My Matters/ValarAI/Strategic' },
  { id: '18', name: 'ValarAI_Financial_Statements_Q3_2024.xlsx', type: 'file', modifiedDate: '2024-11-20', size: '2.1 MB', path: 'My Matters/ValarAI/Financials' },
  { id: '19', name: 'ValarAI_Competitive_Analysis.docx', type: 'file', modifiedDate: '2024-11-15', size: '1.7 MB', path: 'My Matters/ValarAI/Strategic' },
  { id: '20', name: 'ValarAI_Technology_Risk_Assessment.pdf', type: 'file', modifiedDate: '2024-11-10', size: '2.4 MB', path: 'My Matters/ValarAI/Risk' },
  { id: '21', name: 'ValarAI_Regulatory_Compliance_Review.pdf', type: 'file', modifiedDate: '2024-11-05', size: '1.9 MB', path: 'My Matters/ValarAI/Compliance' },
  { id: '12', name: 'Settlement_Agreement_Final.pdf', type: 'file', modifiedDate: '2024-01-07', size: '1.8 MB', path: 'My Matters/Litigation/Settlements' },
  { id: '13', name: 'Patent_Application_2024.pdf', type: 'file', modifiedDate: '2024-01-06', size: '4.2 MB', path: 'My Matters/GlobalTech Inc/Patents' },
  { id: '14', name: 'Board_Resolution_Q1.docx', type: 'file', modifiedDate: '2024-01-05', size: '567 KB', path: 'My Matters/Acme Corporation/Corporate' },
  { id: '15', name: 'Compliance_Review_2024.xlsx', type: 'file', modifiedDate: '2024-01-04', size: '890 KB', path: 'My Matters/Compliance' },
  { id: '16', name: 'Merger_Agreement_Draft.pdf', type: 'file', modifiedDate: '2024-01-03', size: '3.2 MB', path: 'My Matters/M&A/Unicorn Capital' }
];

export default function IManageFilePickerDialog({ 
  isOpen, 
  onClose, 
  onFilesSelected,
  overlayClassName 
}: iManageFilePickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showIManage, setShowIManage] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShowProgressBar(false);
      setShowIManage(false);
      setRowSelection({});
      setSearchQuery("");
    }
  }, [isOpen]);

  // Layout constants
  const HARVEY_SIZE = 40;
  const IMANAGE_SIZE = 40;
  const PROGRESS_BAR_WIDTH = 64;
  const GAP_PX = 8;
  const LEFT_OFFSET = PROGRESS_BAR_WIDTH / 2 + GAP_PX + HARVEY_SIZE / 2;
  const RIGHT_OFFSET = PROGRESS_BAR_WIDTH / 2 + GAP_PX + IMANAGE_SIZE / 2;
  const PROGRESS_SEGMENT_MIN = 16;
  const PROGRESS_SEGMENT_MAX = 32;
  const PROGRESS_TRAVEL = PROGRESS_BAR_WIDTH - PROGRESS_SEGMENT_MIN;

  useEffect(() => {
    if (!showIManage) return;

    const progressBarTimeout = setTimeout(() => setShowProgressBar(true), 150);
    const closeTimeout = setTimeout(() => setIsLoading(false), 2600);

    return () => {
      clearTimeout(progressBarTimeout);
      clearTimeout(closeTimeout);
    };
  }, [showIManage]);

  const table = useReactTable({
    data: mockFiles,
    columns,
    state: {
      rowSelection,
      globalFilter: searchQuery,
    },
    enableRowSelection: true, // Enable selection for all rows including folders
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleAdd = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const files = selectedRows.map(row => row.original);
    onFilesSelected?.(files);
    onClose();
  };

  const dialogContent = (
    <>
      <DialogTitle className="sr-only">Select Files from iManage</DialogTitle>
        {/* Loading Splash Screen */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              className="absolute inset-0 bg-white z-50 flex items-center justify-center"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <motion.div 
                  className="absolute z-20"
                  initial={{ scale: 0, x: 0 }}
                  animate={{ 
                    scale: [0, 1.2, 1],
                    x: -LEFT_OFFSET
                  }}
                  transition={{ 
                    scale: { duration: 0.6, ease: "easeOut", times: [0, 0.6, 1] },
                    x: { delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }
                  }}
                  onUpdate={(latest: { x?: number }) => {
                    const xVal = latest.x;
                    if (!showIManage && typeof xVal === 'number' && xVal <= -LEFT_OFFSET + 0.5) {
                      setShowIManage(true);
                    }
                  }}
                >
                  <Image 
                    src="/Harvey_Glyph_Circle.svg" 
                    alt="Harvey" 
                    width={HARVEY_SIZE} 
                    height={HARVEY_SIZE}
                  />
                </motion.div>
                
                <AnimatePresence>
                  {showIManage && (
                    <motion.div 
                      className="absolute z-10"
                      initial={{ scale: 0, opacity: 0, x: RIGHT_OFFSET }}
                      animate={{ scale: [0, 1.1, 1], opacity: 1, x: RIGHT_OFFSET }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Image 
                        src="/imanage_circle_blue.svg" 
                        alt="iManage" 
                        width={IMANAGE_SIZE} 
                        height={IMANAGE_SIZE}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {showProgressBar && (
                    <motion.div 
                      className="absolute z-0"
                      initial={{ opacity: 0, y: 12, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 360, damping: 26 }}
                      style={{ willChange: "transform, opacity" }}
                    >
                      <div className="w-[64px] h-1 bg-neutral-200 rounded-full overflow-hidden relative">
                        <motion.div
                          className="absolute left-0 top-0 h-full bg-black rounded-full"
                          initial={{ x: 0, width: PROGRESS_SEGMENT_MIN }}
                          animate={{ 
                            x: [0, PROGRESS_TRAVEL],
                            width: [PROGRESS_SEGMENT_MIN, PROGRESS_SEGMENT_MAX, PROGRESS_SEGMENT_MIN]
                          }}
                          transition={{ 
                            x: { duration: 0.42, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 0.06 },
                            width: { duration: 0.42, ease: "easeInOut", times: [0, 0.5, 1], repeat: Infinity, repeatType: "reverse", delay: 0.06 }
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <motion.div 
                  className="absolute bottom-16 left-0 right-0 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.3 }}
                >
                  <p className="text-sm text-neutral-500">Connecting to iManage...</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="h-[38px] w-[38px] rounded-md bg-neutral-100 flex items-center justify-center">
              <Image src="/imanage.svg" alt="iManage" width={24} height={24} />
            </div>
            <span className="text-md font-medium text-neutral-900">Select files from iManage</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700 self-start"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-neutral-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 border-neutral-200 focus:ring-1 focus:ring-neutral-300 font-normal text-neutral-900 placeholder:text-neutral-500"
              style={{ height: '36px', fontSize: '14px' }}
            />
          </div>
          
          {/* Filter Chips */}
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors">
              <Plus className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-700">Document type</span>
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors">
              <Plus className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-700">File type</span>
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors">
              <History className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-700">Recent</span>
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors">
              <Star className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-700">Favorites</span>
            </button>
          </div>
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-auto">
          {!isLoading && (
            <table className="w-full">
              <thead className="sticky top-0 z-10 h-8" style={{background: 'linear-gradient(to bottom, white calc(100% - 1px), rgb(212, 212, 212) 100%)'}}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "py-2 text-left text-xs font-medium text-neutral-600 tracking-wider",
                          header.id === 'select' ? "pl-4 pr-0.5" : 
                          header.id === 'name' ? "pl-1 pr-4" : "px-4"
                        )}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12">
                      <p className="text-sm text-neutral-500">No files found</p>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-neutral-50 transition-colors cursor-pointer",
                        row.getIsSelected() && "bg-neutral-100 hover:bg-neutral-100"
                      )}
                      onClick={() => {
                        row.toggleSelected();
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "py-3 text-sm text-neutral-900",
                            cell.column.id === 'select' ? "pl-4 pr-0.5" : 
                            cell.column.id === 'name' ? "pl-1 pr-4" : "px-4"
                          )}
                          style={{ width: cell.column.getSize() }}
                          onClick={(e) => {
                            // Prevent row click when clicking checkbox
                            if ((e.target as HTMLElement).tagName === 'INPUT') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="flex items-center justify-between px-3 py-3 border-t border-neutral-200">
            <p className="text-sm text-neutral-600">
              {table.getSelectedRowModel().rows.length} {table.getSelectedRowModel().rows.length === 1 ? 'file' : 'files'} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdd} 
                disabled={table.getSelectedRowModel().rows.length === 0}
              >
                Add selected files
              </Button>
            </div>
          </div>
        )}
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {overlayClassName ? (
        <DialogPortal>
          <DialogOverlay className={overlayClassName} />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 w-[800px] max-w-[800px] h-[600px] translate-x-[-50%] translate-y-[-50%] border border-neutral-200 bg-white duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg p-0 gap-0 overflow-hidden flex flex-col"
          >
            {dialogContent}
          </DialogPrimitive.Content>
        </DialogPortal>
      ) : (
        <DialogContent className="w-[800px] max-w-[800px] h-[600px] p-0 gap-0 overflow-hidden flex flex-col">
          {dialogContent}
        </DialogContent>
      )}
    </Dialog>
  );
}
