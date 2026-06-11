/**
* Meadow RocksDB Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

// rocksdb is an optional peer dependency -- consumers install it explicitly to enable this provider
let libRocksDB = false;
try
{
	libRocksDB = require('rocksdb');
}
catch (pRequireError)
{
	try
	{
		// file: and npm-link installs symlink this package outside the application tree, so the peer must also be resolved from the entry script's paths
		libRocksDB = require(require.resolve('rocksdb', { paths: require.main ? require.main.paths : [] }));
	}
	catch (pFallbackRequireError)
	{
		libRocksDB = false;
	}
}

const ROCKSDB_MISSING_MESSAGE = `The optional peer dependency [rocksdb] is not installed; Meadow-Connection-RocksDB cannot connect without it.  Run [npm install rocksdb] in your application (on GCC 13+ toolchains: [CXXFLAGS="-include cstdint" npm install rocksdb]).`;

/*
	Configuration pattern:

	{
		"RocksDB": {
			"RocksDBFolder": "./data/rocksdb"
		}
	}
*/

class MeadowConnectionRocksDB extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionRocksDB';

		this.connected = false;
		this._database = false;

		if (this.fable.settings.hasOwnProperty('RocksDB'))
		{
			if (this.fable.settings.RocksDB.hasOwnProperty('RocksDBFolder'))
			{
				this.options.RocksDBFolder = this.fable.settings.RocksDB.RocksDBFolder;
			}
		}
	}

	connect()
	{
		this.connectAsync();
	}

	connectAsync(fCallback)
	{
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow RocksDB connect() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}

		if (!libRocksDB)
		{
			this.log.error(ROCKSDB_MISSING_MESSAGE);
			return tmpCallback(new Error(ROCKSDB_MISSING_MESSAGE));
		}

		let tmpConnectionSettings = this.options;

		if (!tmpConnectionSettings.RocksDBFolder)
		{
			this.log.error(`Meadow-Connection-RocksDB trying to connect to RocksDB but the database folder path is invalid; RocksDBFolder must be in either the fable.settings.RocksDB object or the connection provider constructor options.`, tmpConnectionSettings);
			return tmpCallback(new Error(`Meadow-Connection-RocksDB trying to connect to RocksDB but the database folder path is invalid.`));
		}

		if (this.connected)
		{
			this.log.error(`Meadow-Connection-RocksDB trying to connect to RocksDB but is already connected - skipping the second connect call.`);
			return tmpCallback(null, this._database);
		}
		else
		{
			try
			{
				this.log.info(`Meadow-Connection-RocksDB connecting to folder [${tmpConnectionSettings.RocksDBFolder}].`);
				this._database = libRocksDB(tmpConnectionSettings.RocksDBFolder);
				this._database.open({ createIfMissing: true }, (pError) =>
				{
					if (pError)
					{
						this.log.error(`Meadow-Connection-RocksDB error opening database at [${tmpConnectionSettings.RocksDBFolder}]: ${pError}`);
						return tmpCallback(pError);
					}
					this.log.info(`Meadow-Connection-RocksDB successfully connected to RocksDB folder [${tmpConnectionSettings.RocksDBFolder}].`);
					this.connected = true;
					return tmpCallback(null, this._database);
				});
			}
			catch (pError)
			{
				this.log.error(`Meadow-Connection-RocksDB error connecting to RocksDB folder [${tmpConnectionSettings.RocksDBFolder}]: ${pError}`);
				return tmpCallback(pError);
			}
		}
	}

	closeAsync(fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => { };
		if (!this.connected || !this._database)
		{
			return tmpCallback();
		}
		this._database.close((pError) =>
		{
			if (pError)
			{
				this.log.error(`Meadow-Connection-RocksDB error closing database: ${pError}`);
			}
			this.connected = false;
			this._database = false;
			return tmpCallback(pError);
		});
	}

	get db()
	{
		return this._database;
	}
}

module.exports = MeadowConnectionRocksDB;
