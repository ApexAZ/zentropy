#!/usr/bin/env node

/**
 * Coverage threshold checker for Vitest
 * Reads coverage results from JSON output and enforces 80% minimum thresholds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COVERAGE_FILE = 'coverage-results.json';
const MINIMUM_THRESHOLD = 80;

function checkCoverage() {
    const coverageFile = path.join(process.cwd(), COVERAGE_FILE);
    
    if (!fs.existsSync(coverageFile)) {
        console.error('❌ Coverage results file not found:', COVERAGE_FILE);
        process.exit(1);
    }

    let coverageData;
    try {
        const rawData = fs.readFileSync(coverageFile, 'utf8');
        coverageData = JSON.parse(rawData);
    } catch (error) {
        console.error('❌ Failed to parse coverage results:', error.message);
        process.exit(1);
    }

    // Extract coverage summary - this may vary based on Vitest version
    const summary = coverageData.coverageSummary || coverageData.summary;
    
    if (!summary) {
        console.error('❌ No coverage summary found in results');
        process.exit(1);
    }

    const metrics = {
        lines: summary.lines?.pct || 0,
        statements: summary.statements?.pct || 0,
        functions: summary.functions?.pct || 0,
        branches: summary.branches?.pct || 0
    };

    console.log('\n📊 Frontend Coverage Results:');
    console.log(`Lines:      ${metrics.lines.toFixed(2)}%`);
    console.log(`Statements: ${metrics.statements.toFixed(2)}%`);
    console.log(`Functions:  ${metrics.functions.toFixed(2)}%`);
    console.log(`Branches:   ${metrics.branches.toFixed(2)}%`);

    const failures = [];
    
    Object.entries(metrics).forEach(([metric, percentage]) => {
        if (percentage < MINIMUM_THRESHOLD) {
            failures.push(`${metric} (${percentage.toFixed(2)}%)`);
        }
    });

    if (failures.length > 0) {
        console.error(`\n❌ Coverage threshold failures (minimum ${MINIMUM_THRESHOLD}%):`);
        failures.forEach(failure => console.error(`   • ${failure}`));
        console.error('\nPlease add tests to improve coverage before committing.\n');
        process.exit(1);
    }

    console.log(`\n✅ All coverage thresholds meet minimum ${MINIMUM_THRESHOLD}% requirement\n`);
    
    // Clean up the temporary file
    fs.unlinkSync(coverageFile);
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    checkCoverage();
}