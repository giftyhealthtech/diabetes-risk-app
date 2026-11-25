const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export class PredictionRequestError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PredictionRequestError'
    this.userMessage = message
  }
}


export async function warmPredictionService() {
  try {
    const response = await fetch(`${apiBaseUrl}/warmup`, {
      method: 'POST',
    })

    if (!response.ok) {
      console.error('Could not start model warm-up')
    }
  } catch (error) {
    console.error('Model warm-up request failed:', error)
  }
}

export async function waitUntilModelReady(maxMs = 300000) {
  await warmPredictionService() // restarts warm-up if the model went back to sleep
  const deadline = Date.now() + maxMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/warmup/status`)
      if (response.ok && (await response.json()).status === 'ready') {
        return true
      }
    } catch {
      // backend may still be waking up, keep trying
    }
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  return false
}

export async function submitPrediction(payload) {
  let response
  try {
    response = await fetch(`${apiBaseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new PredictionRequestError(
      'The prediction service could not be reached. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    if (response.status === 422) {
      throw new PredictionRequestError(
        'Some information could not be validated. Check the values and try again.',
      )
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new PredictionRequestError(
        'The prediction service is temporarily unavailable. Please try again later.',
      )
    }
    throw new PredictionRequestError(
      'We could not complete the prediction. Please try again later.',
    )
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new PredictionRequestError(
      'The prediction service returned an unexpected response. Please try again later.',
    )
  }

  const isLegacyResponse =
    result !== null &&
    typeof result === 'object' &&
    (Object.hasOwn(result, 'Diabetes') || Object.hasOwn(result, 'prediction')) &&
    typeof result.probability === 'number' &&
    Number.isFinite(result.probability)
  const isCurrentResponse =
    result !== null &&
    typeof result === 'object' &&
    typeof result.diabetes_status === 'string' &&
    typeof result.chance_of_diabetes === 'string' &&
    /^\d+(?:\.\d+)?%$/.test(result.chance_of_diabetes)
  const optionalTextFields = ['message', 'explanation', 'disclaimer']
  const hasInvalidOptionalField =
    result !== null &&
    typeof result === 'object' &&
    optionalTextFields.some(
      (field) => result[field] !== undefined && typeof result[field] !== 'string',
    )

  if (
    (!isLegacyResponse && !isCurrentResponse) ||
    hasInvalidOptionalField
  ) {
    throw new PredictionRequestError(
      'The prediction service returned an unexpected response. Please try again later.',
    )
  }

  return result
}
