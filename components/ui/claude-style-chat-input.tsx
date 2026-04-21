import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  Lock,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

/* --- ICONS --- */
export const Icons = {
  Plus,
  Lock,
  Thinking: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10.3857 2.50977C14.3486 2.71054 17.5 5.98724 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 9.72386 2.72386 9.5 3 9.5C3.27614 9.5 3.5 9.72386 3.5 10C3.5 13.5899 6.41015 16.5 10 16.5C13.5899 16.5 16.5 13.5899 16.5 10C16.5 6.5225 13.7691 3.68312 10.335 3.50879L10 3.5L9.89941 3.49023C9.67145 3.44371 9.5 3.24171 9.5 3C9.5 2.72386 9.72386 2.5 10 2.5L10.3857 2.50977ZM10 5.5C10.2761 5.5 10.5 5.72386 10.5 6V9.69043L13.2236 11.0527C13.4706 11.1762 13.5708 11.4766 13.4473 11.7236C13.3392 11.9397 13.0957 12.0435 12.8711 11.9834L12.7764 11.9473L9.77637 10.4473C9.60698 10.3626 9.5 10.1894 9.5 10V6C9.5 5.72386 9.72386 5.5 10 5.5ZM3.66211 6.94141C4.0273 6.94159 4.32303 7.23735 4.32324 7.60254C4.32324 7.96791 4.02743 8.26446 3.66211 8.26465C3.29663 8.26465 3 7.96802 3 7.60254C3.00021 7.23723 3.29676 6.94141 3.66211 6.94141ZM4.95605 4.29395C5.32146 4.29404 5.61719 4.59063 5.61719 4.95605C5.6171 5.3214 5.3214 5.61709 4.95605 5.61719C4.59063 5.61719 4.29403 5.32146 4.29395 4.95605C4.29395 4.59057 4.59057 4.29395 4.95605 4.29395ZM7.60254 3C7.96802 3 8.26465 3.29663 8.26465 3.66211C8.26446 4.02743 7.96791 4.32324 7.60254 4.32324C7.23736 4.32302 6.94159 4.0273 6.94141 3.66211C6.94141 3.29676 7.23724 3.00022 7.60254 3Z" />
    </svg>
  ),
  SelectArrow: ChevronDown,
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Archive,
};

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/* --- TYPES --- */
type UploadStatus = 'pending' | 'uploading' | 'complete';

export interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: UploadStatus;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  locked?: boolean;         // true if the user cannot select this model
  lockedReason?: string;   // tooltip shown on hover when locked
  group?: string;          // group label shown as a section header in the dropdown
}

interface ClaudeChatInputProps {
  onSendMessage: (data: {
    message: string;
    files: AttachedFile[];
    pastedContent: PastedContent[];
    model: string;
    isThinkingEnabled: boolean;
  }) => void;
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/* --- COMPONENTS --- */
const FilePreviewCard: React.FC<{
  file: AttachedFile;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/') && file.preview;

  return (
    <div className="relative flex h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted/50 transition-all hover:border-muted-foreground">
      {isImage ? (
        <div className="relative h-full w-full">
          <img
            src={file.preview!}
            alt={file.file.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/0" />
        </div>
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="rounded bg-muted p-1.5">
              <Icons.FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {file.file.name.split('.').pop()}
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="truncate text-xs font-medium text-foreground" title={file.file.name}>
              {file.file.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => onRemove(file.id)}
        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        type="button"
      >
        <Icons.X className="h-3 w-3" />
      </button>

      {file.uploadStatus === 'uploading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Icons.Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}
    </div>
  );
};

const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  return (
    <div className="relative flex h-28 w-28 flex-shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="w-full overflow-hidden">
        <p className="line-clamp-4 break-words whitespace-pre-wrap text-[10px] leading-[1.4] text-muted-foreground">
          {content.content}
        </p>
      </div>

      <div className="mt-2 flex w-full items-center justify-between">
        <div className="inline-flex items-center justify-center rounded border border-border bg-background px-1.5 py-[2px]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Pasted
          </span>
        </div>
      </div>

      <button
        onClick={() => onRemove(content.id)}
        className="absolute right-2 top-2 rounded-full border border-border bg-background p-[3px] text-muted-foreground opacity-0 shadow-sm transition-colors hover:text-foreground group-hover:opacity-100"
        type="button"
      >
        <Icons.X className="h-2 w-2" />
      </button>
    </div>
  );
};

const ModelSelector: React.FC<{
  models: ModelOption[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}> = ({ models, selectedModel, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel =
    models.find((m) => m.id === selectedModel) || models[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentModel) {
    return null;
  }

  // Build grouped model list
  const groupedModels: Array<{ groupLabel: string | null; items: ModelOption[] }> = [];
  let currentGroup: { groupLabel: string | null; items: ModelOption[] } | null = null;
  for (const model of models) {
    const groupLabel = model.group ?? null;
    if (!currentGroup || currentGroup.groupLabel !== groupLabel) {
      currentGroup = { groupLabel, items: [] };
      groupedModels.push(currentGroup);
    }
    currentGroup.items.push(model);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex h-8 min-w-[4rem] items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium transition ${
          isOpen
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        type="button"
      >
        <span className="whitespace-nowrap">{currentModel.name}</span>
        {currentModel.locked && (
          <Icons.Lock className="h-3 w-3 opacity-60" />
        )}
        <span className="flex h-5 w-5 items-center justify-center opacity-75">
          <Icons.SelectArrow
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-[280px] overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-xl">
          {groupedModels.map((group, gi) => (
            <div key={gi}>
              {group.groupLabel && (
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.groupLabel}
                </div>
              )}
              {group.items.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    if (model.locked) return;
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                  title={model.locked ? model.lockedReason : undefined}
                  className={`group flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                    model.locked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-muted'
                  }`}
                  type="button"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {model.locked && (
                        <Icons.Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-[13px] font-semibold text-foreground">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="rounded-full border border-border px-1.5 py-[1px] text-[10px] font-medium text-muted-foreground">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {model.locked && model.lockedReason
                        ? model.lockedReason
                        : model.description}
                    </span>
                  </div>
                  {!model.locked && selectedModel === model.id && (
                    <Icons.Check className="mt-1 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ClaudeChatInput: React.FC<ClaudeChatInputProps> = ({
  onSendMessage,
  models,
  selectedModelId,
  onSelectModel,
  placeholder = 'How can I help you today?',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 384) + 'px';
    }
  }, [message]);

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const newFiles = Array.from(newFilesList).map((file) => {
      const isImage =
        file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).slice(2, 11),
        file,
        type: isImage ? 'image/unknown' : file.type || 'application/octet-stream',
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: 'uploading' as const,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    setMessage((prev) => {
      if (prev) return prev;
      if (newFiles.length === 1) {
        return newFiles[0].type.startsWith('image/')
          ? 'Analyzed image...'
          : 'Analyzed document...';
      }
      return `Analyzed ${newFiles.length} files...`;
    });

    newFiles.forEach((file) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((item) =>
            item.id === file.id ? { ...item, uploadStatus: 'complete' } : item
          )
        );
      }, 800 + Math.random() * 1000);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((file) => file.id === id);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }

    const text = e.clipboardData.getData('text');
    if (text.length > 300) {
      e.preventDefault();
      const snippet: PastedContent = {
        id: Math.random().toString(36).slice(2, 11),
        content: text,
        timestamp: new Date(),
      };
      setPastedContent((prev) => [...prev, snippet]);

      if (!message) {
        setMessage('Analyzed pasted text...');
      }
    }
  };

  const handleSend = () => {
    if (disabled) return;
    if (!message.trim() && files.length === 0 && pastedContent.length === 0) {
      return;
    }
    onSendMessage({
      message,
      files,
      pastedContent,
      model: selectedModelId,
      isThinkingEnabled,
    });
    setMessage('');
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim() || files.length > 0 || pastedContent.length > 0;

  const dragOverlayClasses = useMemo(
    () =>
      `absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-muted/90 backdrop-blur-sm`,
    []
  );

  return (
    <div
      className="relative mx-auto w-full max-w-2xl font-sans transition-all duration-300"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="relative z-10 mx-2 flex flex-col items-stretch rounded-2xl border border-border bg-background shadow-sm transition-all duration-200 hover:shadow-md focus-within:shadow-md md:mx-0">
        <div className="flex flex-col gap-2 px-3 pb-2 pt-3">
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((item) => item.id !== id))
                  }
                />
              ))}
              {files.map((file) => (
                <FilePreviewCard key={file.id} file={file} onRemove={removeFile} />
              ))}
            </div>
          )}

          <div className="relative mb-1">
            <div className="max-h-96 w-full min-h-[2.5rem] overflow-y-auto break-words pl-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="block w-full resize-none overflow-hidden border-0 bg-transparent py-0 text-[16px] font-normal leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                rows={1}
                autoFocus
                style={{ minHeight: '1.5em' }}
              />
            </div>
          </div>

          <div className="flex w-full items-center gap-2">
            <div className="relative flex min-w-0 flex-1 items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                type="button"
                aria-label="Attach files"
              >
                <Icons.Plus className="h-5 w-5" />
              </button>

              <div className="flex min-w-8 shrink-0">
                <button
                  onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                  className={`group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 ${
                    isThinkingEnabled
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-pressed={isThinkingEnabled}
                  aria-label="Extended thinking"
                  type="button"
                >
                  <Icons.Thinking className="h-5 w-5" />
                  <div className="pointer-events-none absolute left-1/2 top-full mt-2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-[6px] bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    <span>Extended thinking</span>
                    <span className="text-[10px] opacity-70">⇧+Ctrl+E</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-1">
              <div className="shrink-0 p-1 -m-1">
                <ModelSelector
                  models={models}
                  selectedModel={selectedModelId}
                  onSelect={onSelectModel}
                />
              </div>

              <div>
                <button
                  onClick={handleSend}
                  disabled={!hasContent || disabled}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    hasContent && !disabled
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      : 'cursor-default bg-primary/30 text-primary-foreground/60'
                  }`}
                  type="button"
                  aria-label="Send message"
                >
                  <Icons.ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDragging && (
        <div className={dragOverlayClasses}>
          <Icons.Archive className="mb-2 h-10 w-10 animate-bounce text-primary" />
          <p className="font-medium text-primary">Drop files to upload</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          AI can make mistakes. Please check important information.
        </p>
      </div>
    </div>
  );
};

export default ClaudeChatInput;
