import { useState, useRef, useCallback } from 'react';

const MAX_FILES = 3;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function PhotoUpload({ files, onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validate = useCallback(
    (newFiles) => {
      const allFiles = [...files, ...newFiles];
      if (allFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} photos allowed.`);
        return null;
      }
      for (const f of newFiles) {
        if (!ALLOWED_TYPES.includes(f.type)) {
          setError(`"${f.name}" is not a supported image format.`);
          return null;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`"${f.name}" exceeds the ${MAX_SIZE_MB}MB limit.`);
          return null;
        }
      }
      setError('');
      return allFiles;
    },
    [files]
  );

  const handleFiles = useCallback(
    (incoming) => {
      const list = Array.from(incoming);
      const validated = validate(list);
      if (validated) onChange(validated);
    },
    [validate, onChange]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
    setError('');
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-navy-700 hover:border-gray-500 bg-navy-800/50'
        } ${files.length >= MAX_FILES ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <svg
          className="mx-auto w-12 h-12 text-gray-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-300 font-medium">
          Drag & drop photos here, or{' '}
          <span className="text-amber-500 underline">browse</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Up to {MAX_FILES} images, {MAX_SIZE_MB}MB each (JPG, PNG, WebP)
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {files.map((file, i) => (
            <div key={i} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${i + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-navy-700"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
