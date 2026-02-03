#![cfg(test)]

use super::*;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

/// Mock token contract for testing send_token. Returns a fixed balance and no-ops on transfer.
#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    /// Returns a fixed balance (1000) for any address so the payment contract "has" tokens to send.
    pub fn balance(_env: Env, _from: Address) -> i128 {
        1000
    }

    /// No-op transfer for testing (we only verify send_token runs and returns true).
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let _ = (from, to, amount);
    }
}

#[test]
fn test_send_token() {
    let env = Env::default();
    env.mock_all_auths(); // token.transfer(from, ...) requires auth from "from" (the payment contract)
    let payment_contract_id = env.register_contract(None, SimplePayment);
    let token_contract_id = env.register_contract(None, MockToken);
    let client = SimplePaymentClient::new(&env, &payment_contract_id);

    let recipient = Address::generate(&env);
    let amount = 100_i128;

    let result = client.send_token(&token_contract_id, &recipient, &amount);

    assert!(result);
}
