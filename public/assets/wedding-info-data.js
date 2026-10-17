export function findAnswers(question, entries) {
  const normalized = String(question).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const padded = ' ' + normalized + ' ';
  const ranked = entries.map(entry => ({entry, score:entry.keywords.reduce((score, keyword) => padded.includes(' '+keyword+' ') ? score+keyword.split(' ').length+1 : score,0)})).filter(item => item.score>0).sort((a,b)=>b.score-a.score);
  return ranked.length ? ranked.filter(item=>item.score>=ranked[0].score*0.65).slice(0,3).map(item=>item.entry) : [];
}
