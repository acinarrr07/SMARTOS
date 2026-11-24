import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dishes, weekMenu, demoReviews } from '../js/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const localeTR = JSON.parse(fs.readFileSync(path.join(root, 'locales/tr.json'), 'utf8'));
const localeEN = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'));
const appJS = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

const htmlKeys = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));
const placeholderKeys = new Set([...html.matchAll(/data-i18n-placeholder="([^"]+)"/g)].map((m) => m[1]));
const localeKeys = new Set(Object.keys(localeTR));
const localeENKeys = new Set(Object.keys(localeEN));
for (const key of [...htmlKeys, ...placeholderKeys]) {
  if (!(key in localeTR)) fail(`Turkish locale missing key: ${key}`);
  if (!(key in localeEN)) fail(`English locale missing key: ${key}`);
}
if (localeKeys.size === localeENKeys.size && [...localeKeys].every((key) => localeENKeys.has(key))) pass(`TR/EN locales contain matching ${localeKeys.size} keys`);
else fail('TR and EN locale key sets do not match');
if ([...htmlKeys, ...placeholderKeys].every((key) => key in localeTR && key in localeEN)) pass('All static translation keys are present');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicateIds.length) fail(`Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);
else pass(`HTML contains ${ids.length} unique IDs`);

const dishIds = new Set(dishes.map((d) => d.id));
if (dishIds.size !== dishes.length) fail('Dish IDs are not unique');
else pass(`${dishes.length} sample dishes have unique IDs`);
for (const [dayIndex, day] of weekMenu.entries()) {
  for (const id of day.items) if (!dishIds.has(id)) fail(`Week day ${dayIndex} references missing dish ${id}`);
}
if (weekMenu.length === 5 && weekMenu.every((day) => day.items.length > 0)) pass(`${weekMenu.length} sample weekdays reference valid dishes`);
for (const dish of dishes) {
  for (const nutrient of ['calories','protein','carbs','fat','fiber','salt']) {
    if (typeof dish[nutrient] !== 'number' || dish[nutrient] < 0) fail(`${dish.id} has invalid ${nutrient}`);
  }
  for (const field of ['ingredients','ingredientsEn','steps','stepsEn','allergens','tags']) {
    if (!Array.isArray(dish[field])) fail(`${dish.id} has invalid ${field}`);
  }
}
pass('Dish nutrition, ingredient, allergen, recipe and diet-tag data structures are valid');

const refs = [
  ...[...html.matchAll(/href="(css\/[^\"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/src="(js\/[^\"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/href="(favicon\.svg)"/g)].map((m) => m[1])
];
for (const ref of refs) if (!fs.existsSync(path.join(root, ref))) fail(`Referenced local asset missing: ${ref}`);
if (refs.every((ref) => fs.existsSync(path.join(root, ref)))) pass('All local CSS, JS and favicon references resolve');

const usedStaticIds = new Set([...appJS.matchAll(/\$\('#([^']+)'/g)].map((m) => m[1]));
const dynamicIds = new Set(['demo-login-form','display-name','modal-close','photo-preview','review-copy','review-dish','review-form','review-photo-input','auth-mode','auth-display-wrap','auth-password','auth-submit','auth-display-name','remote-auth-form','auth-email']);
for (const id of usedStaticIds) {
  if (!ids.includes(id) && !dynamicIds.has(id) && !id.includes(' ')) fail(`App references missing static element #${id}`);
}
pass('App static DOM selectors resolve (modal-created form elements are explicitly accounted for)');

for (const file of ['js/app.js','js/data.js']) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`JavaScript syntax error in ${file}: ${result.stderr}`);
}
if (process.exitCode !== 1) pass('JavaScript syntax checks passed');

console.log(`Demo seed: ${demoReviews.length} clearly labeled sample reviews.`);
if (process.exitCode === 1) process.exit(1);
console.log('Frontend validation completed successfully.');
