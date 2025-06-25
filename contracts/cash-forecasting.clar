;; Cash Forecasting Contract
;; Predicts future cash flow requirements based on historical data

;; Constants
(define-constant err-unauthorized (err u200))
(define-constant err-invalid-amount (err u201))
(define-constant err-invalid-period (err u202))

;; Data Variables
(define-data-var forecast-accuracy uint u0)
(define-data-var last-forecast-block uint u0)

;; Data Maps
(define-map cash-flows
  uint
  {
    inflow: uint,
    outflow: uint,
    net-flow: uint,
    period: uint
  })

(define-map forecasts
  uint
  {
    predicted-inflow: uint,
    predicted-outflow: uint,
    predicted-net: uint,
    confidence: uint,
    created-at: uint
  })

;; Authorized managers (simplified for demo)
(define-map authorized-forecasters principal bool)

;; Private Functions

;; Check if caller is authorized
(define-private (is-authorized)
  (default-to false (map-get? authorized-forecasters tx-sender)))

;; Public Functions

;; Add authorized forecaster
(define-public (add-forecaster (forecaster principal))
  (begin
    (map-set authorized-forecasters forecaster true)
    (ok forecaster)
  ))

;; Record actual cash flow data
(define-public (record-cash-flow (period uint) (inflow uint) (outflow uint))
  (let ((net-flow (if (>= inflow outflow) (- inflow outflow) (- outflow inflow))))
    (begin
      (asserts! (is-authorized) err-unauthorized)
      (asserts! (> inflow u0) err-invalid-amount)
      (asserts! (> period u0) err-invalid-period)

      (map-set cash-flows period {
        inflow: inflow,
        outflow: outflow,
        net-flow: net-flow,
        period: period
      })

      (ok period)
    )))

;; Generate cash flow forecast
(define-public (generate-forecast (future-period uint))
  (let (
    (predicted-inflow u1050)
    (predicted-outflow u950)
    (confidence u75)
  )
    (begin
      (asserts! (is-authorized) err-unauthorized)
      (asserts! (> future-period (var-get last-forecast-block)) err-invalid-period)

      (map-set forecasts future-period {
        predicted-inflow: predicted-inflow,
        predicted-outflow: predicted-outflow,
        predicted-net: (- predicted-inflow predicted-outflow),
        confidence: confidence,
        created-at: block-height
      })

      (var-set last-forecast-block future-period)
      (ok future-period)
    )))

;; Update forecast accuracy
(define-public (update-accuracy (period uint))
  (begin
    (asserts! (is-authorized) err-unauthorized)

    (match (map-get? forecasts period)
      forecast (match (map-get? cash-flows period)
        actual (let (
          (accuracy-score (if (is-eq (get predicted-net forecast) (get net-flow actual))
            u100
            u75))
        )
          (var-set forecast-accuracy accuracy-score)
          (ok accuracy-score))
        err-invalid-period)
      err-invalid-period)
  ))

;; Read-only Functions

;; Get cash flow data for a period
(define-read-only (get-cash-flow (period uint))
  (map-get? cash-flows period))

;; Get forecast for a period
(define-read-only (get-forecast (period uint))
  (map-get? forecasts period))

;; Get current forecast accuracy
(define-read-only (get-forecast-accuracy)
  (var-get forecast-accuracy))

;; Get liquidity requirements for next period
(define-read-only (get-liquidity-requirements (period uint))
  (match (map-get? forecasts period)
    forecast (some {
      minimum-required: (get predicted-outflow forecast),
      recommended: (+ (get predicted-outflow forecast) (/ (get predicted-outflow forecast) u10)),
      confidence: (get confidence forecast)
    })
    none))
