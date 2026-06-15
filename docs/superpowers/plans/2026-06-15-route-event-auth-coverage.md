# Route Event Auth Coverage

## Goal

Add one focused adversarial test for the public polling route. The event stream is the
widget freshness path, so a wrong-board token must not read another board's event log.

## Scope

- Add a route-level negative test for `/boards/:boardId/events`.
- Prove the response is unauthorized and no board A event payload is exposed through board B.
- Avoid product-code changes unless the test reveals a bug.

## Verification

- Run the focused route test.
- Run the broader available unit suite if the focused test passes.
