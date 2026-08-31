import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Cpu } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {/* Agent Name */}
        <div>
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
      </div>

      {/* Model Selection by Provider */}
      <div className="space-y-6">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          Primary Model Engine *
        </label>

        {Object.entries(AI_MODELS_INFO).map(([providerName, models]) => (
          <div key={providerName} className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{providerName}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {models.map((model) => {
                const isSelected = currentModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setValue('model', model.id)}
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
                      {model.badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                          {model.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                      {model.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] mono text-zinc-500 font-medium">
                      <span>Speed: {model.speed}</span>
                      <span>{model.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
