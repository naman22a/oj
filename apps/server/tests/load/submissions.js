import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PROBLEM_SLUG = __ENV.PROBLEM_SLUG || 'two-sum';
const LANGUAGE = __ENV.LANGUAGE || 'cpp';

const submissionLatency = new Trend('submission_latency', true);
const acceptedSubmissions = new Counter('accepted_submissions');
const rejectedSubmissions = new Counter('rejected_submissions');
const submissionSuccess = new Rate('submission_success');

// Replace with a solution matching your problem's input/output format
// if you also want to measure successful execution.
const CODE = `#include <iostream>
using namespace std;

int main() {
    return 0;
}`;

export const options = {
    vus: 500,
    duration: '5m',

    thresholds: {
        submission_success: ['rate>0.99'],
        submission_latency: ['p(95)<500'],
        http_req_failed: ['rate<0.01']
    }
};

export function setup() {
    const response = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: __ENV.EMAIL || 'test@gmail.com',
            password: __ENV.PASSWORD || 'test123'
        }),
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const loginSuccessful = check(response, {
        'login successful': (r) => r.status === 200,
        'access token received': (r) => {
            try {
                return Boolean(r.json('accessToken'));
            } catch {
                return false;
            }
        }
    });

    if (!loginSuccessful) {
        throw new Error(
            `Login failed: status=${response.status}, body=${response.body}`
        );
    }

    return {
        token: response.json('accessToken')
    };
}

export default function (data) {
    const idempotencyKey = `${__VU}-${__ITER}-${Date.now()}-${Math.random()}`;

    const response = http.post(
        `${BASE_URL}/api/submissions/${PROBLEM_SLUG}`,
        JSON.stringify({
            code: CODE,
            language: LANGUAGE
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.token}`,
                'Idempotency-Key': idempotencyKey
            },
            tags: {
                endpoint: 'create_submission',
                language: LANGUAGE
            }
        }
    );

    const accepted = check(response, {
        'submission accepted (202)': (r) => r.status === 202,
        'submission ID returned': (r) => {
            try {
                return Boolean(r.json('data.submissionId'));
            } catch {
                return false;
            }
        }
    });

    submissionLatency.add(response.timings.duration);
    submissionSuccess.add(accepted);

    if (accepted) {
        acceptedSubmissions.add(1);
    } else {
        rejectedSubmissions.add(1);
    }

    // No sleep: generate continuous submission traffic.
}
