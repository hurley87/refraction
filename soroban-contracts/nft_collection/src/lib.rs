#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable, Base, NonFungibleToken,
};

#[contract]
pub struct NonFungibleTokenContract;

#[contractimpl]
impl NonFungibleTokenContract {
    /// Constructor to initialize the NFT contract
    /// 
    /// # Arguments
    /// * `owner` - The address that will own the contract (for administrative purposes)
    /// 
    /// # Note
    /// Sets the contract metadata (name, symbol, URI) and assigns the owner.
    /// The owner can be used for future administrative functions, but any user can mint NFTs.
    pub fn __constructor(e: &Env, owner: Address) {
        // Set token metadata
        Base::set_metadata(
            e,
            String::from_str(e, "ipfs://bafkreigyr5cezc5v7eug4nad7jolyvvp3szwm2oh3njxbeqxozj66zbwdm"),
            String::from_str(e, "IRL Test Collection"),
            String::from_str(e, "IRL001"),
        );

        // Set the contract owner
        ownable::set_owner(e, &owner);
    }

    /// Get the XLM native asset contract address
    /// 
    /// In Soroban, XLM (the native Stellar asset) has a contract address that is network-specific.
    /// You can get the XLM contract address using: `soroban contract id asset --asset native --network <network>`
    fn get_native_asset_address(env: &Env) -> Address {
        // XLM native asset contract address for Testnet
        // For other networks, update this address
        // Get it using: soroban contract id asset --asset native --network <network>
        let native_asset_str = String::from_str(env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
        Address::from_string(&native_asset_str)
    }

    /// Mint a new NFT to the specified address
    /// 
    /// # Arguments
    /// * `to` - The address that will receive the newly minted NFT
    /// 
    /// # Returns
    /// Returns the token ID of the newly minted NFT (sequential, starting from 1)
    /// 
    /// # Note
    /// Any user can mint NFTs. The function automatically transfers 1 XLM (10,000,000 stroops)
    /// from the recipient (`to`) to the contract as payment. The recipient must have sufficient XLM balance
    /// and must authorize the transaction (sign it).
    pub fn mint(env: Env, to: Address) -> u32 {
        // Get the native asset (XLM) contract address
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        
        // Require authorization from the recipient (they must sign the transaction)
        // This ensures they are paying for the mint
        to.require_auth();
        
        let contract_address = env.current_contract_address();
        
        // Transfer 1 XLM (10,000,000 stroops) from the recipient to the contract as payment
        let mint_cost: i128 = 10_000_000; // 1 XLM in stroops
        native_token.transfer(&to, &contract_address, &mint_cost);
        
        // Mint the NFT to the recipient
        Base::sequential_mint(&env, &to)
    }

    /// Withdraw XLM from the contract to the owner
    /// 
    /// # Arguments
    /// * `amount` - The amount of XLM (in stroops) to withdraw. If None, withdraws all available balance.
    /// 
    /// # Note
    /// Only the contract owner can call this function. The function transfers XLM from the contract
    /// address to the owner's address. This allows the owner to withdraw minting fees collected by the contract.
    pub fn withdraw(env: Env, amount: Option<i128>) -> i128 {
        // Require that the caller is the owner
        let owner = ownable::get_owner(&env).expect("Contract has no owner");
        owner.require_auth();
        
        // Get the native asset (XLM) contract address
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        
        let contract_address = env.current_contract_address();
        
        // Get the contract's balance
        let contract_balance = native_token.balance(&contract_address);
        
        // Determine how much to withdraw
        let withdraw_amount = match amount {
            Some(amt) => {
                // Validate that requested amount doesn't exceed balance
                if amt > contract_balance {
                    panic!("Insufficient balance: requested {} but contract has {}", amt, contract_balance);
                }
                amt
            }
            None => contract_balance, // Withdraw all if no amount specified
        };
        
        // Transfer XLM from contract to owner
        native_token.transfer(&contract_address, &owner, &withdraw_amount);
        
        withdraw_amount
    }
}

#[contractimpl]
impl NonFungibleToken for NonFungibleTokenContract {
    type ContractType = Base;
}

#[contractimpl]
impl NonFungibleBurnable for NonFungibleTokenContract {}

#[contractimpl]
impl Ownable for NonFungibleTokenContract {}

#[cfg(test)]
mod test;
