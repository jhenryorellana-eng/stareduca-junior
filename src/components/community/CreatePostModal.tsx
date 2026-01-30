'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import type { CommunityPost } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  editingPost?: CommunityPost | null;
  onClose: () => void;
  onSubmit: (content: string, imageFile?: File) => Promise<boolean>;
  isLoading?: boolean;
}

const MAX_CONTENT_LENGTH = 500;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function CreatePostModal({
  isOpen,
  editingPost,
  onClose,
  onSubmit,
  isLoading = false,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingPost;

  useEffect(() => {
    if (isOpen) {
      setContent(editingPost?.content || '');
      setError(null);
      setImageFile(null);
      setImagePreview(editingPost?.imageUrl || null);
      // Focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, editingPost]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Tipo de imagen no permitido. Usa JPG, PNG, GIF o WebP.');
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      setError('La imagen es muy grande. Máximo 5MB.');
      return;
    }

    setError(null);
    setImageFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();

    if (!trimmed) {
      setError('El contenido no puede estar vacío');
      return;
    }

    if (trimmed.length > MAX_CONTENT_LENGTH) {
      setError(`El contenido no puede exceder ${MAX_CONTENT_LENGTH} caracteres`);
      return;
    }

    setError(null);
    const success = await onSubmit(trimmed, imageFile || undefined);

    if (success) {
      setContent('');
      removeImage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <h2 className="text-base font-bold text-slate-900">
            {isEditing ? 'Editar publicación' : 'Nueva publicación'}
          </h2>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !content.trim() || isOverLimit}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-bold transition-all',
              content.trim() && !isOverLimit && !isLoading
                ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Icon name="progress_activity" size={16} className="animate-spin" />
            ) : isEditing ? (
              'Guardar'
            ) : (
              'Publicar'
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            placeholder="¿Qué quieres compartir con la comunidad?"
            className={cn(
              'w-full h-32 resize-none text-base text-slate-800 placeholder:text-slate-400 focus:outline-none',
              error && 'border-b-2 border-red-400'
            )}
            disabled={isLoading}
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-48 object-cover"
              />
              <button
                onClick={removeImage}
                disabled={isLoading}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                title="Quitar imagen"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isLoading}
            />

            {/* Image button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={cn(
                'p-2 rounded-full transition-colors',
                imagePreview
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 text-slate-500'
              )}
              title="Agregar imagen"
            >
              <Icon name="image" size={20} />
            </button>

            <button
              className="p-2 rounded-full hover:bg-gray-100 text-slate-500 transition-colors opacity-50 cursor-not-allowed"
              title="Agregar emoji (próximamente)"
              disabled
            >
              <Icon name="mood" size={20} />
            </button>
          </div>

          <span
            className={cn(
              'text-xs font-medium',
              isOverLimit
                ? 'text-red-500'
                : remainingChars <= 50
                ? 'text-amber-500'
                : 'text-slate-400'
            )}
          >
            {remainingChars}
          </span>
        </div>
      </div>
    </div>
  );
}
