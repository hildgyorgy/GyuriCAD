import { classifySweep, changeSweep, sweepRecipe } from './sweep-model.js';
import { createPathEditor, createProfileEditor } from './sweep-editors.js';
import { createSweepView } from './sweep-view3d.js';

const semanticLabel = document.querySelector('[data-semantic-label]');
const semanticStatus = document.querySelector('[data-semantic-status]');
const recipeOutput = document.querySelector('[data-recipe]');
const classifyButton = document.querySelector('[data-classify]');
const unclassifyButton = document.querySelector('[data-unclassify]');
const riseInput = document.querySelector('[name="pathRise"]');
const riseOutput = document.querySelector('[data-rise-value]');
const spacingInput = document.querySelector('[name="supportSpacing"]');
const spacingOutput = document.querySelector('[data-spacing-value]');
const detailLabel = document.querySelector('[data-sweep-detail]');
const detailDescription = document.querySelector('[data-sweep-detail-description]');

function renderTruth() {
  semanticLabel.textContent = sweepRecipe.semantic.label;
  semanticStatus.textContent = sweepRecipe.semantic.status === 'open' ? 'Még nincs építészeti jelentése' : 'Javasolt szemantikai értelmezés';
  semanticStatus.dataset.state = sweepRecipe.semantic.status;
  classifyButton.hidden = sweepRecipe.semantic.kind === 'gutter';
  unclassifyButton.hidden = sweepRecipe.semantic.kind !== 'gutter';
  recipeOutput.textContent = JSON.stringify({
    operation: sweepRecipe.operation,
    semantic: sweepRecipe.semantic,
    profile: sweepRecipe.profile,
    path: sweepRecipe.path,
    installation: sweepRecipe.installation,
  }, null, 2);
}

classifyButton.addEventListener('click', () => classifySweep('gutter'));
unclassifyButton.addEventListener('click', () => classifySweep('unclassified'));

riseInput.addEventListener('input', () => {
  const rise = Number(riseInput.value);
  riseOutput.textContent = `${rise} cm`;
  changeSweep(recipe => {
    recipe.path.points.forEach((point, index) => {
      point.y = 120 + rise * index / (recipe.path.points.length - 1);
    });
  });
});

spacingInput.value = sweepRecipe.installation.supportSpacing;
spacingOutput.textContent = `${spacingInput.value} cm`;
spacingInput.addEventListener('input', () => {
  spacingOutput.textContent = `${spacingInput.value} cm`;
  changeSweep(recipe => {
    recipe.installation.supportSpacing = Number(spacingInput.value);
  });
});

window.addEventListener('gyuricad:sweep-changed', renderTruth);
createProfileEditor(document.querySelector('#profile-canvas'), sweepRecipe);
createPathEditor(document.querySelector('#path-canvas'), sweepRecipe);
createSweepView(document.querySelector('#sweep-3d'), sweepRecipe, detail => {
  detailLabel.textContent = detail.label;
  detailDescription.textContent = detail.description;
});
renderTruth();
