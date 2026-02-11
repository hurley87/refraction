//! Tests for IRL fungible token contract.

use soroban_sdk::{
    testutils::{Address as _, Ledger, MuxedAddress as _},
    Address, Env,
};

use crate::{IRLToken, IRLTokenClient};

fn setup(e: &Env) -> (IRLTokenClient, Address) {
    let contract_id = e.register_contract(None, IRLToken);
    let client = IRLTokenClient::new(e, &contract_id);
    let owner = Address::generate(e);
    client.constructor(&owner);
    (client, owner)
}

#[test]
fn test_constructor_sets_metadata_and_mints_initial_supply() {
    let e = Env::default();
    e.mock_all_auths();
    let (client, owner) = setup(&e);

    assert_eq!(client.name(), soroban_sdk::String::from_str(&e, "IRL"));
    assert_eq!(client.symbol(), soroban_sdk::String::from_str(&e, "IRL"));
    assert_eq!(client.decimals(), 7);

    let expected_supply: i128 = 1_000_000 * 10i128.pow(7);
    assert_eq!(client.balance(&owner), expected_supply);
}

#[test]
fn test_transfer() {
    let e = Env::default();
    e.mock_all_auths();
    let (client, owner) = setup(&e);
    let recipient = Address::generate(&e);
    let to_muxed = soroban_sdk::MuxedAddress::new(recipient.clone(), 0);

    let amount: i128 = 100 * 10i128.pow(7); // 100 tokens
    client.transfer(&owner, &to_muxed, &amount);

    assert_eq!(client.balance(&owner), 1_000_000 * 10i128.pow(7) - amount);
    assert_eq!(client.balance(&recipient), amount);
}
