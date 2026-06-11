# Simple Keystore Example

A minimal application using `meadow-connection-rocksdb` as a key-value store: connect, put, get, delete, verify, close. Each step prints `[ok]` or `[fail]` and the process exits nonzero on failure, so it doubles as a smoke test for the provider.

## The important part: installing `rocksdb`

`rocksdb` is an **optional peer dependency** of `meadow-connection-rocksdb` -- it is not installed automatically because it compiles a native addon. An application that wants this provider declares both packages in its own `package.json`, as this example does:

```json
"dependencies": {
	"fable": "^3.1.75",
	"meadow-connection-rocksdb": "^1.0.0",
	"rocksdb": "^5.2.1"
}
```

(This example uses `"file:../.."` for `meadow-connection-rocksdb` so it runs against the local checkout.)

## Running

```bash
npm install
npm start
```

On GCC 13 or newer the bundled RocksDB sources fail to compile with `uint64_t does not name a type`; force-include the missing header:

```bash
CXXFLAGS="-include cstdint" npm install
```

The database is created under `data/simple-keystore-rocksdb/` on first run.
