#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Performance baseline tracking
const PERFORMANCE_BASELINE = {
	totalTests: 1330,
	maxExecutionTime: 30000, // 30 seconds - realistic baseline given current test state
	maxPerTestTime: 500, // 500ms per test average
	concurrency: 5
};

function runPerformanceTest() {
	const startTime = Date.now();
	
	try {
		const output = execSync('npm run test:frontend', { 
			encoding: 'utf8',
			timeout: 120000 // 120 second timeout to handle current test issues
		});
		
		const endTime = Date.now();
		const totalTime = endTime - startTime;
		
		// Parse test results
		const results = {
			timestamp: new Date().toISOString(),
			totalExecutionTime: totalTime,
			success: true,
			baseline: PERFORMANCE_BASELINE
		};
		
		// Check against baseline
		if (totalTime > PERFORMANCE_BASELINE.maxExecutionTime) {
			console.warn(`⚠️  Performance regression detected: ${totalTime}ms > ${PERFORMANCE_BASELINE.maxExecutionTime}ms`);
			results.performanceRegression = true;
		} else {
			console.log(`✅ Performance within baseline: ${totalTime}ms`);
			results.performanceRegression = false;
		}
		
		// Save results
		const resultsFile = './test-performance-results.json';
		const existingResults = fs.existsSync(resultsFile) ? 
			JSON.parse(fs.readFileSync(resultsFile, 'utf8')) : [];
		
		existingResults.push(results);
		fs.writeFileSync(resultsFile, JSON.stringify(existingResults, null, 2));
		
		return results;
		
	} catch (error) {
		console.error('❌ Test performance check failed:', error.message);
		process.exit(1);
	}
}

if (require.main === module) {
	runPerformanceTest();
}

module.exports = { runPerformanceTest };