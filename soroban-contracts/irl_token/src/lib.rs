#![no_std]
//! IRL fungible token contract (OpenZeppelin Stellar Base).
//! Name: IRL, Symbol: IRL, 7 decimals, initial supply: 1_000_000 tokens.

use soroban_sdk::{
    contract, contractimpl, token::TokenInterface, Address, Env, MuxedAddress, String,
};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::only_owner;
use stellar_tokens::fungible::Base;

/// Initial supply in display units (1 million tokens).
const INITIAL_SUPPLY_DISPLAY: i128 = 1_000_000;
/// Token decimals (matches app FUNGIBLE_TOKEN_DECIMALS).
const DECIMALS: u32 = 7;
/// Initial supply in smallest units: 1_000_000 * 10^7.
const INITIAL_SUPPLY: i128 = INITIAL_SUPPLY_DISPLAY * 10i128.pow(DECIMALS);

#[contract]
pub struct IRLToken;

#[contractimpl]
impl IRLToken {
    /// Constructor: sets metadata (name "IRL", symbol "IRL", 7 decimals),
    /// sets owner, and mints initial supply of 1_000_000 tokens to the owner.
    ///
    /// # Arguments
    /// * `owner` - Address that will own the contract and receive the initial supply.
    pub fn __constructor(e: &Env, owner: Address) {
        Base::set_metadata(
            e,
            DECIMALS,
            String::from_str(e, "IRL"),
            String::from_str(e, "IRL"),
        );
        ownable::set_owner(e, &owner);
        Base::mint(e, &owner, INITIAL_SUPPLY);
    }

    /// Owner-only mint. Mints `amount` (in smallest units) to `to`.
    #[only_owner]
    pub fn mint(e: &Env, to: Address, amount: i128) {
        Base::mint(e, &to, amount);
    }
}

#[contractimpl]
impl TokenInterface for IRLToken {
    fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        Base::allowance(&e, &from, &spender)
    }

    fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        Base::approve(&e, &from, &spender, amount, expiration_ledger);
    }

    fn balance(e: Env, id: Address) -> i128 {
        Base::balance(&e, &id)
    }

    fn transfer(e: Env, from: Address, to: MuxedAddress, amount: i128) {
        Base::transfer(&e, &from, &to, amount);
    }

    fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        Base::transfer_from(&e, &spender, &from, &to, amount);
    }

    fn burn(e: Env, from: Address, amount: i128) {
        Base::burn(&e, &from, amount);
    }

    fn burn_from(e: Env, spender: Address, from: Address, amount: i128) {
        Base::burn_from(&e, &spender, &from, amount);
    }

    fn decimals(e: Env) -> u32 {
        Base::decimals(&e)
    }

    fn name(e: Env) -> String {
        Base::name(&e)
    }

    fn symbol(e: Env) -> String {
        Base::symbol(&e)
    }
}

#[contractimpl(contracttrait)]
impl Ownable for IRLToken {}

#[cfg(test)]
mod test;
