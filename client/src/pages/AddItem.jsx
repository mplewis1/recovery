import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoUpload from '../components/PhotoUpload';

const CATEGORIES = [
  'Electronics',
  'Jewelry',
  'Bags/Accessories',
  'Vehicles',
  'Art',
  'Musical Instruments',
  'Tools',
  'Other',
];

const FREQUENCIES = [
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: 'daily', label: 'Daily' },
];

export default function AddItem() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('photo'); // 'photo' | 'description'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Photo mode
  const [photos, setPhotos] = useState([]);

  // Shared fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [value, setValue] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  // Description-only fields
  const [itemType, setItemType] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [era, setEra] = useState('');
  const [distinguishingMarks, setDistinguishingMarks] = useState('');
  const [engravings, setEngravings] = useState('');
  const [uniqueFeatures, setUniqueFeatures] = useState('');

  // Scanner config
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(50);
  const [frequency, setFrequency] = useState('daily');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an item name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let res;

      if (mode === 'photo' && photos.length > 0) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('description', description);
        formData.append('brand', brand);
        formData.append('approximate_value', value);
        formData.append('serial_number', serialNumber);
        formData.append('city', city);
        formData.append('search_radius', radius);
        formData.append('scan_frequency', frequency);
        photos.forEach((photo) => formData.append('photos', photo));

        res = await fetch('/api/items', {
          method: 'POST',
          body: formData,
        });
      } else {
        const body = {
          name,
          category,
          description,
          brand,
          approximate_value: value,
          serial_number: serialNumber,
          item_type: itemType,
          material,
          color,
          era,
          distinguishing_marks: distinguishingMarks,
          engravings,
          unique_features: uniqueFeatures,
          city,
          search_radius: radius,
          scan_frequency: frequency,
        };

        res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create item');
      }

      const created = await res.json();
      navigate(`/items/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Add Item to Monitor</h1>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-8 bg-navy-800 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('photo')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'photo'
              ? 'bg-amber-500 text-navy-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Upload Photos
        </button>
        <button
          type="button"
          onClick={() => setMode('description')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'description'
              ? 'bg-amber-500 text-navy-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Description Only
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo upload */}
        {mode === 'photo' && (
          <div>
            <label className="label">Reference Photos</label>
            <PhotoUpload files={photos} onChange={setPhotos} />
          </div>
        )}

        {/* Shared fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Item Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., MacBook Pro 14-inch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {mode === 'photo' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Brand</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Apple"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Approximate Value</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., $1,200"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="If available"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Description-only fields */}
        {mode === 'description' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Item Type</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Wristwatch, Laptop, Ring"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Material</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., 14k Gold, Carbon Fiber"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Color</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Silver, Black"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Approximate Era / Age</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., 1960s, 2023"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Distinguishing Marks</label>
              <input
                type="text"
                className="input-field"
                placeholder="Scratches, dents, stickers, wear patterns"
                value={distinguishingMarks}
                onChange={(e) => setDistinguishingMarks(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Engravings / Initials</label>
              <input
                type="text"
                className="input-field"
                placeholder='e.g., "M.L." on the back'
                value={engravings}
                onChange={(e) => setEngravings(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Unique Features</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Anything that makes this item uniquely identifiable"
                value={uniqueFeatures}
                onChange={(e) => setUniqueFeatures(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Brand</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Apple"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Approximate Value</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., $1,200"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="If available"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Description (both modes) */}
        <div>
          <label className="label">
            {mode === 'description' ? 'Detailed Description' : 'Description'}
          </label>
          <textarea
            className="input-field"
            rows={4}
            placeholder={
              mode === 'description'
                ? 'Describe the item in as much detail as possible. Include size, weight, condition, accessories, packaging, etc.'
                : 'Brief description of the item'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-navy-700 pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Scanner Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">City / Location</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Austin, TX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Scan Frequency</label>
              <select
                className="input-field"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="label">
              Search Radius: <span className="text-amber-500 font-semibold">{radius} miles</span>
            </label>
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10 mi</span>
              <span>200 mi</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-amber flex items-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900" />
                Saving...
              </>
            ) : (
              'Start Monitoring'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
