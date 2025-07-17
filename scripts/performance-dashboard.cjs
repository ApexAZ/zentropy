#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function generatePerformanceDashboard() {
	const resultsFile = './test-performance-results.json';
	
	if (!fs.existsSync(resultsFile)) {
		console.log('No performance results found. Run npm run test:performance first.');
		return;
	}
	
	const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
	const latest = results[results.length - 1];
	
	console.log('\n📊 Frontend Test Performance Dashboard\n');
	console.log(`Latest Run: ${latest.timestamp}`);
	console.log(`Total Execution Time: ${latest.totalExecutionTime}ms`);
	console.log(`Baseline: ${latest.baseline.maxExecutionTime}ms`);
	console.log(`Performance Status: ${latest.performanceRegression ? '❌ REGRESSION' : '✅ GOOD'}`);
	
	// Show trend
	if (results.length > 1) {
		const previous = results[results.length - 2];
		const trend = latest.totalExecutionTime - previous.totalExecutionTime;
		console.log(`Trend: ${trend > 0 ? '+' : ''}${trend}ms from previous run`);
	}
	
	// Show performance history
	console.log('\n📈 Performance History (Last 5 runs):');
	results.slice(-5).forEach((result, index) => {
		const status = result.performanceRegression ? '❌' : '✅';
		console.log(`${index + 1}. ${result.timestamp} - ${result.totalExecutionTime}ms ${status}`);
	});
}

if (require.main === module) {
	generatePerformanceDashboard();
}

module.exports = { generatePerformanceDashboard };