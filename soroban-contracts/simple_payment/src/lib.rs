#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct SimplePayment;

#[contractimpl]
impl SimplePayment {

   
    
    /// Send any fungible token from the contract to a recipient
    ///
    /// The contract must already hold the chosen token (someone transferred it to the contract).
    /// Anyone can call this function to forward that token to a recipient.
    /// Works with XLM (pass the native asset address) or any custom Soroban fungible token.
    ///
    /// # Arguments
    /// * `token_address` - The fungible token contract address (e.g. from `soroban contract id asset --asset native --network <network>` for XLM)
    /// * `recipient` - The Stellar address to send the token to
    /// * `amount` - The amount in the token's smallest units (e.g. stroops for XLM)
    ///
    /// # Returns
    /// Returns true on success
    pub fn send_token(
        env: Env,
        token_address: Address,
        recipient: Address,
        amount: i128,
    ) -> bool {
        let contract_address = env.current_contract_address();

        if recipient == contract_address {
            panic!("Cannot send to contract address");
        }
        if token_address == contract_address {
            panic!("Token address cannot be the contract address");
        }
        if amount <= 0 {
            panic!("Amount must be positive, got: {}", amount);
        }

        let token_client = token::Client::new(&env, &token_address);
        let contract_balance = token_client.balance(&contract_address);

        if contract_balance == 0 {
            panic!(
                "Contract has no balance for this token. The contract must be funded with the token before it can send to recipients."
            );
        }
        if amount > contract_balance {
            panic!(
                "Insufficient token balance: requested {} but contract has {}",
                amount, contract_balance
            );
        }

        token_client.transfer(&contract_address, &recipient, &amount);

        true
    }
    

   

}

#[cfg(test)]
mod test;
