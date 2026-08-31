import os
from litellm import completion, acompletion
from deepeval.models.base_model import DeepEvalBaseLLM
from deepeval.metrics import TaskCompletionMetric, GEval
from deepeval.test_case import LLMTestCaseParams


class LiteLLMGeneratorModel(DeepEvalBaseLLM):
    def __init__(self, model_string: str = "groq/openai/gpt-oss-120b"):
        self.model_string = model_string

    def load_model(self):
        return self

    def generate(self, prompt: str) -> str:
        response = completion(
            model=self.model_string,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    async def a_generate(self, prompt: str) -> str:
        response = await acompletion(
            model=self.model_string,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    def get_model_name(self) -> str:
        return self.model_string


def get_default_judge_model() -> LiteLLMGeneratorModel:
    return LiteLLMGeneratorModel()


def build_deterministic_metrics(metric_names: list[str], judge_model) -> list:
    available = {
        "correctness": lambda: GEval(
            name="Correctness",
            criteria="Evaluate whether 'actual_output' is factually consistent with the core information or intent in 'expected_output'. Minor differences in tone, formatting, or extra helpful details should not be penalized.",
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.EXPECTED_OUTPUT,
            ],
            threshold=0.3,
            model=judge_model,
        )
    }
    return [available[name]() for name in metric_names if name in available]


def build_non_deterministic_metrics(metric_names: list[str], judge_model) -> list:
    available = {
        "task_completion": lambda: TaskCompletionMetric(
            threshold=0.7, model=judge_model
        )
    }
    return [available[name]() for name in metric_names if name in available]