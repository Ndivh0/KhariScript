import {generateEmbedding} from './embedding';
import * as fs from 'fs';
import * as path from 'path';

const VAULT_PATH = path.join(__dirname, '..', '.kharivault.json');
function cosineSimilarity(a: number[], b: number[] {

    //Calculate dot product between two vectors
    const dot= a.reduce((acc, val, i) => acc + val * (b[i]||0), 0);

    //Calculate magnitudes
    const magA = math.sqrt(a.reduce((acc,val) => acc + val * val, 0));
    const magB = math.sqrt(a.reduce((acc,val) => acc + val * val, 0));

    return dot / (magA * magB);
}

//Retrieve the most relevant knowledge entry from the vault
export function retrieveRelevantEntry(text: string): any {
if (!fs.existsSync(VAULT_PATH)) return null;

//Read and parse the vault file
const vault = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8'));
//GEnerate embedding for the input query
const inputEmbedding = generateEmbedding(text);
let bestMAtch = null;
let bestScore = null;

//Loop through vault entries and fund one with the highest similarity score
for (const entry of vault) {
    const score = cosineSimilarity(inputEmbedding, entry.embedding);
    if (score > bestScore) {
        bestScore = score;
        bestMAtch = entry;
    }
}
return bestMAtch;
}
