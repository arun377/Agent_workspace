import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Cpu, Thermometer } from 'lucide-react';
import { AI_MODELS_INFO, CATEGORIES } from '../../data/mockData';
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Agent Name *
          </label>
          <input
            {...register('name')}
            placeholder="e.g. Technical Support & Troubleshooting Specialist"
            className="w-full px-4 py-2.5 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 font-semibold"
          />
          {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Category *
          </label>
          <select
            {...register('category')}
            className="w-full px-4 py-2.5 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 font-medium bg-white dark:bg-slate-900"
          >
            {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
              <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Agent Description *
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Briefly explain what tasks this agent performs and its target capabilities..."
          className="w-full p-3 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 leading-relaxed"
        />
        {errors.description && (
          <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.description.message}</p>
        )}
      </div>

      {/* Model Selection Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Select Primary AI Model Engine *
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
                    ? 'bg-cyan-500/10 border-cyan-600 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-600/50'
                    : 'glass-card border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-4 h-4 ${isSelected ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {model.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                    {model.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed font-normal">
                  {model.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
                  <span>Speed: {model.speed}</span>
                  <span>{model.provider}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Temperature Slider & Configuration */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Temperature (Creativity)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
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
              className="w-16 px-2 py-1 rounded-lg text-xs font-mono font-bold text-center glass-input text-cyan-600 dark:text-cyan-400"
            />
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={currentTemp}
            onChange={(e) => setValue('temperature', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Precise & Analytical (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative & Diverse (1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
