import { readFileSync } from 'node:fs';
import path from 'node:path';

type SvmClassifier = {
  coef: number[];
  intercept: number;
  sigmoidA: number;
  sigmoidB: number;
};

type SvmModel = {
  metadata: {
    metrics?: Record<string, unknown>;
  };
  vectorizer: {
    vocabulary: Record<string, number>;
    idf: number[];
    ngramRange: [number, number];
    sublinearTf: boolean;
    norm: 'l2';
  };
  classifiers: SvmClassifier[];
};

export type LocalSvmResult = {
  label: 'CLEAN' | 'JUDOL';
  confidence: number;
  pJudol: number;
  allScores: { CLEAN: number; JUDOL: number };
};

const MODEL_PATH = path.join(process.cwd(), 'api', '_lib', 'ml', 'svm-level3-model.json');

let cachedModel: SvmModel | null = null;

function getModel(): SvmModel {
  if (!cachedModel) {
    cachedModel = JSON.parse(readFileSync(MODEL_PATH, 'utf-8')) as SvmModel;
  }
  return cachedModel;
}

const TIER3: Record<string, string> = { vv: 'w', '|3': 'b', ph: 'f', ck: 'k' };
const TIER1: Record<string, string> = {
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '0': 'o',
  '7': 't',
  '6': 'b',
  '9': 'g',
};
const TIER2: Record<string, string> = { '@': 'a', '|': 'l', '!': 'i', $: 's', '+': 't' };

function replaceAllLiteral(input: string, oldValue: string, newValue: string): string {
  return input.split(oldValue).join(newValue);
}

function applyLeetNormalization(input: string): string {
  let text = input;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [oldValue, newValue] of Object.entries(TIER3)) text = replaceAllLiteral(text, oldValue, newValue);
    for (const [oldValue, newValue] of Object.entries(TIER1)) text = replaceAllLiteral(text, oldValue, newValue);
    for (const [oldValue, newValue] of Object.entries(TIER2)) text = replaceAllLiteral(text, oldValue, newValue);
  }
  return text;
}

export function preprocessLevel3ForSvm(input: string): string {
  let text = String(input).toLowerCase();
  text = text.replace(/http\S+|www\S+/g, '');
  text = text.replace(/&\w+;/g, '');
  text = text.replace(/[^\w\s]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  text = applyLeetNormalization(text);
  text = text.replace(/(.)\1{2,}/g, '$1$1');
  text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  text = text.replace(/\b(?:\w\.){2,}\w\b/g, (match) => match.replace(/\./g, ''));
  text = text.replace(/\b(?:\w-){2,}\w\b/g, (match) => match.replace(/-/g, ''));
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function tokenize(text: string): string[] {
  return text.match(/\b\w\w+\b/g) ?? [];
}

function vectorize(text: string, model: SvmModel): Map<number, number> {
  const { vocabulary, idf, sublinearTf } = model.vectorizer;
  const tokens = tokenize(text);
  const counts = new Map<number, number>();

  for (let i = 0; i < tokens.length; i += 1) {
    const unigram = tokens[i];
    const unigramIndex = vocabulary[unigram];
    if (unigramIndex !== undefined) counts.set(unigramIndex, (counts.get(unigramIndex) ?? 0) + 1);

    if (i < tokens.length - 1) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      const bigramIndex = vocabulary[bigram];
      if (bigramIndex !== undefined) counts.set(bigramIndex, (counts.get(bigramIndex) ?? 0) + 1);
    }
  }

  let normSquared = 0;
  const values = new Map<number, number>();
  for (const [idx, count] of counts) {
    const tf = sublinearTf ? 1 + Math.log(count) : count;
    const value = tf * idf[idx];
    values.set(idx, value);
    normSquared += value * value;
  }

  const norm = Math.sqrt(normSquared);
  if (norm > 0) {
    for (const [idx, value] of values) values.set(idx, value / norm);
  }
  return values;
}

function sigmoidCalibration(decision: number, classifier: SvmClassifier): number {
  return 1 / (1 + Math.exp(classifier.sigmoidA * decision + classifier.sigmoidB));
}

export function predictLocalSvm(message: string): LocalSvmResult {
  const model = getModel();
  const preprocessed = preprocessLevel3ForSvm(message);
  const features = vectorize(preprocessed, model);

  let pJudol = 0;
  for (const classifier of model.classifiers) {
    let decision = classifier.intercept;
    for (const [idx, value] of features) {
      decision += classifier.coef[idx] * value;
    }
    pJudol += sigmoidCalibration(decision, classifier);
  }
  pJudol /= model.classifiers.length;

  const pClean = 1 - pJudol;
  const isJudol = pJudol >= 0.5;
  return {
    label: isJudol ? 'JUDOL' : 'CLEAN',
    confidence: isJudol ? pJudol : pClean,
    pJudol,
    allScores: { CLEAN: pClean, JUDOL: pJudol },
  };
}
