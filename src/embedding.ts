//Generate a basic frequency based embedding from input text
export function generateEmbedding(text: string): number[] {

    const words = text.toLowerCase().split(/\W+/);
    const wordCounts: Record<string, number> = {};

    for(const word of words) {
        if (!word) continue;
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    //Return top 10 word frequencies as pseudo-embedding
    return Object.values(wordCounts).slice(0, 10);

}
