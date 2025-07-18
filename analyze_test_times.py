
import json

with open('test-results.json', 'r') as f:
    data = json.load(f)

test_suites = {}
for test_suite in data['testResults']:
    suite_path = test_suite['name']
    total_duration = 0
    for test in test_suite['assertionResults']:
        total_duration += test.get('duration', 0)
    test_suites[suite_path] = total_duration

sorted_suites = sorted(test_suites.items(), key=lambda item: item[1], reverse=True)

print("Top 5 slowest test suites:")
for i in range(min(5, len(sorted_suites))):
    suite, duration = sorted_suites[i]
    print(f"{suite}: {duration / 1000:.2f}s")
