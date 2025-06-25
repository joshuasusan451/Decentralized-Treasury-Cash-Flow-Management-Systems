;; Investment Coordination Contract
;; Manages treasury investment strategies and execution

;; Constants
(define-constant err-unauthorized (err u400))
(define-constant err-invalid-proposal (err u401))
(define-constant err-proposal-not-found (err u402))
(define-constant err-already-executed (err u403))
(define-constant err-insufficient-funds (err u404))

;; Data Variables
(define-data-var proposal-counter uint u0)
(define-data-var total-invested uint u0)
(define-data-var total-returns uint u0)

;; Data Maps
(define-map investment-proposals
  uint
  {
    proposer: principal,
    amount: uint,
    investment-type: uint,
    expected-return: uint,
    duration: uint,
    status: uint,
    created-at: uint,
    executed-at: (optional uint)
  })

(define-map investment-performance
  uint
  {
    proposal-id: uint,
    actual-return: uint,
    completion-date: uint,
    performance-score: uint
  })

(define-map investment-votes
  { proposal-id: uint, voter: principal }
  { vote: bool, timestamp: uint })

;; Authorized managers
(define-map authorized-investment-managers principal bool)

;; Private Functions

;; Check if caller is authorized
(define-private (is-authorized)
  (default-to false (map-get? authorized-investment-managers tx-sender)))

;; Public Functions

;; Add authorized manager
(define-public (add-investment-manager (manager principal))
  (begin
    (map-set authorized-investment-managers manager true)
    (ok manager)
  ))

;; Create investment proposal
(define-public (create-proposal (amount uint) (investment-type uint) (expected-return uint) (duration uint))
  (let ((proposal-id (+ (var-get proposal-counter) u1)))
    (begin
      (asserts! (is-authorized) err-unauthorized)
      (asserts! (> amount u0) err-invalid-proposal)
      (asserts! (<= investment-type u3) err-invalid-proposal)
      (asserts! (> expected-return u0) err-invalid-proposal)

      (map-set investment-proposals proposal-id {
        proposer: tx-sender,
        amount: amount,
        investment-type: investment-type,
        expected-return: expected-return,
        duration: duration,
        status: u0,
        created-at: block-height,
        executed-at: none
      })

      (var-set proposal-counter proposal-id)
      (ok proposal-id)
    )))

;; Vote on investment proposal
(define-public (vote-on-proposal (proposal-id uint) (vote bool))
  (begin
    (asserts! (is-authorized) err-unauthorized)
    (asserts! (is-some (map-get? investment-proposals proposal-id)) err-proposal-not-found)

    (map-set investment-votes { proposal-id: proposal-id, voter: tx-sender } {
      vote: vote,
      timestamp: block-height
    })

    (ok vote)
  ))

;; Approve proposal
(define-public (approve-proposal (proposal-id uint))
  (begin
    (asserts! (is-authorized) err-unauthorized)

    (match (map-get? investment-proposals proposal-id)
      proposal (begin
        (asserts! (is-eq (get status proposal) u0) err-already-executed)

        (map-set investment-proposals proposal-id
          (merge proposal { status: u1 }))
        (ok proposal-id))
      err-proposal-not-found)
  ))

;; Execute approved investment
(define-public (execute-investment (proposal-id uint))
  (begin
    (asserts! (is-authorized) err-unauthorized)

    (match (map-get? investment-proposals proposal-id)
      proposal (begin
        (asserts! (is-eq (get status proposal) u1) err-invalid-proposal)

        ;; Update proposal status
        (map-set investment-proposals proposal-id
          (merge proposal {
            status: u2,
            executed-at: (some block-height)
          }))

        ;; Update investment tracking
        (var-set total-invested (+ (var-get total-invested) (get amount proposal)))

        (ok proposal-id))
      err-proposal-not-found)
  ))

;; Record investment returns
(define-public (record-returns (proposal-id uint) (actual-return uint))
  (begin
    (asserts! (is-authorized) err-unauthorized)
    (asserts! (is-some (map-get? investment-proposals proposal-id)) err-proposal-not-found)

    (map-set investment-performance proposal-id {
      proposal-id: proposal-id,
      actual-return: actual-return,
      completion-date: block-height,
      performance-score: u100
    })

    (var-set total-returns (+ (var-get total-returns) actual-return))
    (ok actual-return)
  ))

;; Read-only Functions

;; Get proposal details
(define-read-only (get-proposal (proposal-id uint))
  (map-get? investment-proposals proposal-id))

;; Get investment performance
(define-read-only (get-performance (proposal-id uint))
  (map-get? investment-performance proposal-id))

;; Get vote details
(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? investment-votes { proposal-id: proposal-id, voter: voter }))

;; Get total investments
(define-read-only (get-total-invested)
  (var-get total-invested))

;; Get total returns
(define-read-only (get-total-returns)
  (var-get total-returns))

;; Calculate overall ROI
(define-read-only (get-overall-roi)
  (if (> (var-get total-invested) u0)
    (/ (* (var-get total-returns) u100) (var-get total-invested))
    u0))
