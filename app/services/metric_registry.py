from deepeval.metrics import TaskCompletionMetric, StepEfficiencyMetric


def build_metrics(metric_names: list[str], judge_model) -> list:
    available = {
        "task_completion": lambda: TaskCompletionMetric(threshold=0.7, model=judge_model),
        "step_efficiency": lambda: StepEfficiencyMetric(threshold=0.7, model=judge_model),
    }

    metrics = []
    for name in metric_names:
        if name not in available:
            raise ValueError(f"Unknown metric: {name}")
        metrics.append(available[name]())
    return metrics