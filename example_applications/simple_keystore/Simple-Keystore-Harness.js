/**
* Simple keystore harness for Meadow-Connection-RocksDB.
*
* Connects to a local RocksDB folder, writes a record, reads it back,
* deletes it and verifies the deletion.  Prints [ok]/[fail] per step and
* exits nonzero on the first failure, so it doubles as a smoke test.
*
* @author Steven Velozo <steven@velozo.com>
*/
const libFable = require('fable');
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');
const libFS = require('fs');
const libPath = require('path');

const DATABASE_FOLDER = libPath.join(__dirname, 'data', 'simple-keystore-rocksdb');
const TEST_KEY = 'User/0000000001';
const TEST_RECORD = { IDUser: 1, UserName: 'Aria', UserRole: 'Archivist' };

let _Fable = new libFable(
{
	Product: 'Simple-Keystore-Example',
	RocksDB:
	{
		RocksDBFolder: DATABASE_FOLDER
	}
});

/**
* Report a step outcome and abort the harness on failure.
*
* @param {boolean} pSuccess - Whether the step succeeded.
* @param {string} pDescription - Human-readable description of the step.
*/
function reportStep(pSuccess, pDescription)
{
	console.log(`[${pSuccess ? 'ok' : 'fail'}] ${pDescription}`);
	if (!pSuccess)
	{
		process.exit(1);
	}
}

// rocksdb's createIfMissing only creates the leaf folder, not parent directories
libFS.mkdirSync(DATABASE_FOLDER, { recursive: true });

_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

_Fable.MeadowRocksDBProvider.connectAsync(
	(pConnectError) =>
	{
		reportStep(!pConnectError, `connect to RocksDB folder [${DATABASE_FOLDER}]`);

		let tmpDatabase = _Fable.MeadowRocksDBProvider.db;

		tmpDatabase.put(TEST_KEY, JSON.stringify(TEST_RECORD),
			(pPutError) =>
			{
				reportStep(!pPutError, `put record at key [${TEST_KEY}]`);

				tmpDatabase.get(TEST_KEY, { asBuffer: false },
					(pGetError, pValue) =>
					{
						let tmpRecord = pGetError ? false : JSON.parse(pValue);
						reportStep(!pGetError && tmpRecord.UserName === TEST_RECORD.UserName, `get record back and match UserName [${TEST_RECORD.UserName}]`);

						tmpDatabase.del(TEST_KEY,
							(pDelError) =>
							{
								reportStep(!pDelError, `delete record at key [${TEST_KEY}]`);

								tmpDatabase.get(TEST_KEY, { asBuffer: false },
									(pMissingError) =>
									{
										reportStep(!!pMissingError, `confirm deleted key is gone`);

										_Fable.MeadowRocksDBProvider.closeAsync(
											(pCloseError) =>
											{
												reportStep(!pCloseError, `close the database`);
												console.log('Simple keystore example completed successfully.');
											});
									});
							});
					});
			});
	});
