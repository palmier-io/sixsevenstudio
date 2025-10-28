import { Zap, Sparkles, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LLM_MODELS, LLM_MODEL_LABELS, type LLMModel } from '@/types/constants';

const iconMap = {
  Zap,
  Sparkles,
  Brain,
};

interface ModelSelectProps {
  value: LLMModel;
  onValueChange: (value: LLMModel) => void;
  size?: 'default' | 'compact';
  className?: string;
}

export function ModelSelect({ value, onValueChange, size = 'default', className }: ModelSelectProps) {
  const sizeClasses = {
    default: {
      trigger: 'h-8 min-h-8 max-h-8 w-[90px] text-[12px] px-2 py-0',
      icon: 'size-3',
      gap: 'gap-1',
    },
    compact: {
      trigger: 'h-5 min-h-5 max-h-5 w-[90px] text-[10px] px-1.5 py-0',
      icon: 'size-2.5',
      gap: 'gap-0.5',
    },
  };

  const classes = sizeClasses[size];

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as LLMModel)}>
      <SelectTrigger className={`${classes.trigger} ${className || ''}`}>
        <SelectValue>
          <span className={`flex items-center ${classes.gap}`}>
            {(() => {
              const Icon = iconMap[LLM_MODEL_LABELS[value].icon as keyof typeof iconMap];
              return <Icon className={classes.icon} />;
            })()}
            <span>{LLM_MODEL_LABELS[value].label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LLM_MODELS.map((model) => {
          const Icon = iconMap[LLM_MODEL_LABELS[model].icon as keyof typeof iconMap];
          return (
            <SelectItem key={model} value={model} className="text-xs">
              <div className="flex flex-col">
                <span className="font-medium flex items-center gap-1.5">
                  <Icon className="size-3" />
                  <span>{LLM_MODEL_LABELS[model].label}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{model}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
