use crate::prompts::Provider;
use keyring::Entry;

const SERVICE: &str = "com.distill.app";

fn entry(provider: Provider) -> Result<Entry, String> {
    Entry::new(SERVICE, provider.keychain_account()).map_err(|e| e.to_string())
}

pub fn set_key(provider: Provider, key: &str) -> Result<(), String> {
    entry(provider)?
        .set_password(key)
        .map_err(|e| e.to_string())
}

pub fn get_key(provider: Provider) -> Result<Option<String>, String> {
    match entry(provider)?.get_password() {
        Ok(s) => Ok(Some(s)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete_key(provider: Provider) -> Result<(), String> {
    match entry(provider)?.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn has_key(provider: Provider) -> bool {
    matches!(get_key(provider), Ok(Some(_)))
}
