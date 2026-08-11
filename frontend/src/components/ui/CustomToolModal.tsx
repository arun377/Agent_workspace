import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wrench, Globe, FileText, Sparkles, Code } from 'lucide-react';
import { GlassModal } from './GlassModal';
import { CustomToolFormData } from '../../types/agent';
import { useAgentStore } from '../../store/useAgentStore';
import { useToast } from './Toast';

const customToolSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['search', 'scraping', 'utility', 'data', 'communication', 'custom']),
  endpointUrl: z.string().url('Must be a valid HTTP or HTTPS endpoint URL'),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  schema: z.string().min(2, 'Schema definition is required'),
});

interface CustomToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolCreated?: (toolId: string) => void;
}

export const CustomToolModal: React.FC<CustomToolModalProps> = ({ isOpen, onClose, onToolCreated }) => {
  const { createCustomTool } = useAgentStore();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomToolFormData>({
    resolver: zodResolver(customToolSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'custom',
      endpointUrl: 'https://api.example.com/v1/action',
      httpMethod: 'POST',
      schema: '{\n  "query": "string",\n  "max_results": 10\n}',
    },
  });

  const onSubmit = (data: CustomToolFormData) => {
    const createdTool = createCustomTool(data);
    showToast('Custom Tool Registered!', `Added "${data.name}" to tool catalog.`, 'success');
    if (onToolCreated) {
      onToolCreated(createdTool.id);
    }
    reset();
    onClose();
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom API Tool"
      subtitle="Define custom HTTP webhooks or REST endpoints for your AI Agent to invoke."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tool Name *
            </label>
            <div className="relative">
              <Wrench className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                {...register('name')}
                placeholder="e.g. Stripe Customer Lookup"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100"
              />
            </div>
            {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
            >
              <option value="custom">Custom API</option>
              <option value="data">Data / DB</option>
              <option value="utility">Utility</option>
              <option value="search">Search</option>
              <option value="communication">Communication</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tool Description *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              {...register('description')}
              placeholder="Explains to the AI agent when and how to invoke this tool..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100"
            />
          </div>
          {errors.description && (
            <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.description.message}</p>
          )}
        </div>

        {/* Endpoint URL & HTTP Method */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              HTTP Method
            </label>
            <select
              {...register('httpMethod')}
              className="w-full px-3 py-2 rounded-xl text-xs glass-input font-bold text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-900"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Endpoint URL *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                {...register('endpointUrl')}
                placeholder="https://api.yourdomain.com/v1/resource"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            {errors.endpointUrl && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.endpointUrl.message}</p>
            )}
          </div>
        </div>

        {/* Schema JSON */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Input Parameter JSON Schema *
            </label>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
              <Code className="w-3 h-3 text-cyan-500" /> JSON Format
            </span>
          </div>
          <textarea
            {...register('schema')}
            rows={4}
            className="w-full p-3 rounded-xl text-xs font-mono glass-input text-slate-900 dark:text-slate-100 leading-relaxed"
          />
          {errors.schema && (
            <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.schema.message}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save & Attach Tool</span>
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
