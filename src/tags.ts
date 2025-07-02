//Return matching tags based on known programming key words
export function generateTags(text: string): string[] {

const keywords = ['function', 'variable', 'loop', 'async', 'scope']; //Basic seed list
return keywords.filter(keyword => text.includes(keyword));
}
