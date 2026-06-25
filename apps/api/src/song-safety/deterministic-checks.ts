import rules from './safety-rules.json';
import type { CleanInputs, DeterministicResult, Violation } from './types.js';

function compilePatterns(patterns: string[]) {
  return patterns.map((pattern) => new RegExp(pattern, 'i'));
}

const blockedPatterns = Object.fromEntries(
  Object.entries(rules.blockedPatterns).map(([key, patterns]) => [key, compilePatterns(patterns)])
) as Record<keyof typeof rules.blockedPatterns, RegExp[]>;

const piiPatterns = Object.fromEntries(
  Object.entries(rules.piiPatterns).map(([key, patterns]) => [key, compilePatterns(patterns)])
) as Record<keyof typeof rules.piiPatterns, RegExp[]>;

const unsafeLexicon = Object.fromEntries(
  Object.entries(rules.unsafeLexicon).map(([key, words]) => [key, words.map((word) => new RegExp(word, 'i'))])
) as Record<keyof typeof rules.unsafeLexicon, RegExp[]>;

function pushPatternFailures(fails: Violation[], code: string, message: string, patterns: RegExp[], lyrics: string) {
  const matched = patterns.find((pattern) => pattern.test(lyrics));
  if (matched) fails.push({ code, message, detail: matched.source });
}

function checkStructure(lyrics: string, fails: Violation[]) {
  const tagMatches = lyrics.match(/\[(Verse 1|Chorus|Verse 2|Outro)\]/g) ?? [];
  const required = rules.requiredTags;
  const requiredInOrder = required.every((tag, index) => tagMatches[index] === tag);
  if (tagMatches.length !== required.length || !requiredInOrder) {
    fails.push({
      code: 'invalid_structure',
      message: 'Lyrics must use [Verse 1]/[Chorus]/[Verse 2]/[Chorus]/[Outro] in order.'
    });
  }

  if (lyrics.length > rules.maxCharacters) {
    fails.push({ code: 'too_long', message: `Lyrics exceed ${rules.maxCharacters} characters.` });
  }

  const nonEmptyLineCount = lyrics.split('\n').filter((line) => line.trim()).length;
  if (nonEmptyLineCount > rules.maxNonEmptyLines) {
    fails.push({ code: 'too_many_lines', message: `Lyrics exceed ${rules.maxNonEmptyLines} non-empty lines.` });
  }
}

function checkPii(lyrics: string, clean: CleanInputs, fails: Violation[]) {
  pushPatternFailures(fails, 'pii_phone', 'Lyrics contain a phone-number-like pattern.', piiPatterns.phone, lyrics);
  pushPatternFailures(fails, 'pii_address', 'Lyrics contain an address-like pattern.', piiPatterns.address, lyrics);

  const allowedNameContext = `${clean.name}야|${clean.name}아|${clean.name}!|${clean.name}`;
  const lyricsWithoutChildName = lyrics.replace(new RegExp(allowedNameContext, 'g'), '');
  pushPatternFailures(
    fails,
    'pii_person_name',
    'Lyrics contain a person-name-like pattern other than the provided child name.',
    piiPatterns.personName,
    lyricsWithoutChildName
  );
}

export function deterministicChecks(lyrics: string, clean: CleanInputs): DeterministicResult {
  const fails: Violation[] = [];
  checkStructure(lyrics, fails);

  pushPatternFailures(fails, 'future_role', 'Future-role framing is not allowed.', blockedPatterns.futureRole, lyrics);
  pushPatternFailures(fails, 'loss_threat', 'Loss or threat framing is not allowed.', blockedPatterns.lossThreat, lyrics);
  pushPatternFailures(fails, 'dangerous_action', 'Dangerous object or action is not allowed.', blockedPatterns.dangerousAction, lyrics);
  pushPatternFailures(fails, 'secret_separation', 'Secret or caregiver-separation language is not allowed.', blockedPatterns.secretSeparation, lyrics);
  pushPatternFailures(fails, 'instruction_injection', 'Instruction-like text is not allowed in lyrics.', blockedPatterns.instructionInjection, lyrics);
  pushPatternFailures(fails, 'profanity_hate_sexual', 'Profanity, hate, or sexual language is not allowed.', unsafeLexicon.profanityHateSexual, lyrics);
  pushPatternFailures(fails, 'self_harm_eating_body', 'Self-harm, eating guilt, or body-shaming language is not allowed.', unsafeLexicon.selfHarmEatingBody, lyrics);
  checkPii(lyrics, clean, fails);

  return { pass: fails.length === 0, fails };
}
