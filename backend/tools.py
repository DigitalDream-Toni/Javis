"""Safe, local tools available to Jarvis and external tool clients."""
from __future__ import annotations

import ast
import operator
from datetime import UTC, datetime
from typing import Any


class ToolError(ValueError):
    pass


OPERATORS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Pow: operator.pow, ast.USub: operator.neg}


def calculate(expression: str) -> float | int:
    def evaluate(node: ast.AST) -> float | int:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](evaluate(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](evaluate(node.left), evaluate(node.right))
        raise ToolError("Only basic arithmetic is allowed.")

    if len(expression) > 200:
        raise ToolError("The expression is too long.")
    return evaluate(ast.parse(expression, mode="eval").body)


TOOL_MANIFEST = [
    {"name": "current_time", "description": "Return the current UTC time.", "input": {}},
    {"name": "calculator", "description": "Evaluate a basic arithmetic expression.", "input": {"expression": "string"}},
]


def execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    if name == "current_time":
        return {"utc": datetime.now(UTC).isoformat()}
    if name == "calculator":
        return {"result": calculate(str(arguments.get("expression", "")))}
    raise ToolError(f"Unknown tool: {name}")

