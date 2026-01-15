#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn test_send() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SimplePayment);
    let client = SimplePaymentClient::new(&env, &contract_id);

    // Create test addresses
    let recipient = Address::generate(&env);
    
    // Fund the contract (in a real scenario, you'd send XLM to the contract first)
    // For testing, we'll simulate this
    
    // Test sending
    let amount = 10_000_000; // 1 XLM in stroops
    let result = client.send(&recipient, &amount);
    
    assert!(result);
}
