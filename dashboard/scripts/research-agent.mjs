import { promises as fs } from 'fs';
import { WebSearch } from '@openclaw/sdk';

async function main() {
  const goals = await fs.readFile('/home/openclaw/.openclaw/workspace/planning/goals.md', 'utf-8');
  const goalLines = goals.split('\n').filter(line => line.trim().startsWith('- '));

  for (const line of goalLines) {
    const goal = line.substring(2).trim();
    console.log(`Researching for goal: ${goal}`);

    const search = new WebSearch();
    const results = await search.search(`strategies for ${goal}`);

    // Create a research idea
    const idea = {
      title: `Research on: ${goal}`,
      summary: `Found ${results.length} results for ${goal}.`,
      sources: results.map(r => r.url),
      next_steps: ['Review search results', 'Synthesize findings'],
      goal_tags: [goal],
    };

    console.log('Generated idea:', idea);
    // TODO: Post to Telegram and save to DB
  }
}

main().catch(console.error);
