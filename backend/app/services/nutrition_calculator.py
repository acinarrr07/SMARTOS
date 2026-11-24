"""Transparent recipe nutrition calculation; does not invent missing nutrient values."""
from __future__ import annotations
from typing import Any

NUTRIENTS = ('energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'salt_g')

def calculate_per_serving(ingredients: list[dict[str, Any]], servings: int) -> dict[str, Any]:
    if servings < 1:
        raise ValueError('servings must be at least 1')
    totals = {key: 0.0 for key in NUTRIENTS}
    missing: list[str] = []
    sources: list[str] = []
    for index, ingredient in enumerate(ingredients, start=1):
        name = str(ingredient.get('name') or f'ingredient_{index}')
        grams = ingredient.get('grams')
        values = ingredient.get('per_100g')
        source = ingredient.get('source')
        if not isinstance(grams, (int, float)) or grams < 0 or not isinstance(values, dict):
            missing.append(name)
            continue
        for nutrient in NUTRIENTS:
            value = values.get(nutrient)
            if not isinstance(value, (int, float)) or value < 0:
                missing.append(name)
                break
        else:
            for nutrient in NUTRIENTS:
                totals[nutrient] += float(grams) * float(values[nutrient]) / 100.0
            if source:
                sources.append(str(source))
    per_serving = {key: round(value / servings, 2) for key, value in totals.items()}
    return {
        'per_serving': per_serving,
        'recipe_total': {key: round(value, 2) for key, value in totals.items()},
        'servings': servings,
        'status': 'estimated' if not missing else 'incomplete',
        'missing_ingredients': sorted(set(missing)),
        'sources': sorted(set(sources)),
        'note': 'Calculated only from supplied nutrient records; missing records are not estimated.'
    }
