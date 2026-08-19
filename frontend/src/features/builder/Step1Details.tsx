import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Cpu, Thermometer } from 'lucide-react';
import { AI_MODELS_INFO, CATEGORIES } from '../../data/constants';
import { AgentBuilderFormData } from './AgentBuilderPage';

interface Step1DetailsProps {
  form: UseFormReturn<AgentBuilderFormData>;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({ form }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const currentModel = watch('model');
  const currentTemp = watch('temperature');

  return (
    <div className="space-y-6">
      {/* Basic Meta Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agent Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Agent Name *
          </label>
          <input
            {...register('name')}
            placeholder="e.g. Technical Support Specialist"
            className="w-full px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800"
          />
          {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Category *
          </label>
          <select
            {...register('category')}
            className="w-full px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
              <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
          Agent Description *
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Briefly explain what tasks this agent performs and its target capabilities..."
          className="w-full p-3.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 leading-relaxed border border-zinc-200 dark:border-zinc-800"
        />
        {errors.description && (
          <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.description.message}</p>
        )}
      </div>

      {/* Model Selection Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Primary Model Engine *
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AI_MODELS_INFO.map((model) => {
            const isSelected = currentModel === model.id;
            return (
              <div
                key={model.id}
                onClick={() => {
                  setValue('model', model.id);
                  if (model.recommendedTemp) {
                    setValue('temperature', model.recommendedTemp);
                  }
                }}
                className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-900/10 dark:ring-white/10 bg-zinc-100/60 dark:bg-zinc-800/60 shadow-xs'
                    : 'glass-card border-zinc-200 dark:border-zinc-800/70 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-4 h-4 ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {model.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                    {model.badge}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                  {model.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] mono text-zinc-500 font-medium">
                  <span>Speed: {model.speed}</span>
                  <span>{model.provider}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Temperature Slider & Configuration */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Temperature (Creativity)
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Controls randomness. Lower values (0.1) are deterministic; higher values (0.9) are creative.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.05"
              min="0.0"
              max="1.0"
              value={currentTemp}
              onChange={(e) => setValue('temperature', parseFloat(e.target.value) || 0.3)}
              className="w-16 px-2 py-1 rounded-lg text-xs mono font-bold text-center glass-input text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={currentTemp}
            onChange={(e) => setValue('temperature', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Precise (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
