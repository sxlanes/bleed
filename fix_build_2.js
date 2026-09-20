const fs = require('fs');
let code = fs.readFileSync('lib/quantification.ts', 'utf8');

code = code.replace(
  "calculationDetails: isHttp\n          ? `Modern browsers display an explicit 'Not secure' badge. Baymard Institute benchmarks show 19% of ready-to-buy users abandon checkout when they perceive the connection is unsafe.`\n          : `Publicly broadcasting an end-of-life PHP version invites automated exploitation, risking search engine blacklisting (Google Safe Browsing).`,",
  "calculationDetails: isHttp\n          ? `Modern browsers display an explicit 'Not secure' badge. Baymard Institute benchmarks show 19% of ready-to-buy users abandon checkout when they perceive the connection is unsafe.`\n          : `Publicly broadcasting an end-of-life PHP version invites automated exploitation, risking search engine blacklisting (Google Safe Browsing).`,\n        explanation: `Your server advertises an out-of-date setup (${reasons.join(\", \")}). Beyond the hack risk, modern browsers demote the ranking and warn ${words.customers} in ways that break trust.`,"
);

fs.writeFileSync('lib/quantification.ts', code);
