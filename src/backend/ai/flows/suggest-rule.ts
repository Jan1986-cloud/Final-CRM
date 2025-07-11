'use server';

/**
 * @fileOverview An AI agent that suggests the best rule to use based on client information.
 *
 * - suggestRule - A function that suggests the best rule to use based on client information.
 * - SuggestRuleInput - The input type for the suggestRule function.
 * - SuggestRuleOutput - The return type for the suggestRule function.
 */

import {ai} from '@/backend/ai/genkit';
import {z} from 'genkit';

const SuggestRuleInputSchema = z.object({
  clientInformation: z
    .string()
    .describe('Detailed information about the client, including their history, interactions, and any relevant notes.'),
  availableRules: z
    .string()
    .describe('A list of available rules that can be applied, with a brief description of each rule.'),
});
export type SuggestRuleInput = z.infer<typeof SuggestRuleInputSchema>;

const SuggestRuleOutputSchema = z.object({
  suggestedRule: z
    .string()
    .describe('The name of the suggested rule that is most relevant to the client, based on the provided information.'),
  reasoning: z
    .string()
    .describe('Explanation of why the suggested rule is the most appropriate for this client.'),
});
export type SuggestRuleOutput = z.infer<typeof SuggestRuleOutputSchema>;

export async function suggestRule(input: SuggestRuleInput): Promise<SuggestRuleOutput> {
  return suggestRuleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRulePrompt',
  input: {schema: SuggestRuleInputSchema},
  output: {schema: SuggestRuleOutputSchema},
  prompt: `You are an expert CRM system. Your task is to suggest the best rule to apply to a client based on their information and the available rules.

Client Information: {{{clientInformation}}}

Available Rules: {{{availableRules}}}

Based on the client information and available rules, suggest the most relevant rule and explain your reasoning.

Output:
Suggested Rule: {{suggestedRule}}
Reasoning: {{reasoning}}`,
});

const suggestRuleFlow = ai.defineFlow(
  {
    name: 'suggestRuleFlow',
    inputSchema: SuggestRuleInputSchema,
    outputSchema: SuggestRuleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
