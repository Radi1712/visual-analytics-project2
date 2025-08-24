import { loadAndProcessData } from "./data_processing";
import { initTask2 } from "./task2/task2";
import { initTask3 } from "./task3/task3";

// Wait until data is available
await loadAndProcessData();

//--------------------------------------------------------------------------------------------------
// Task 2
//--------------------------------------------------------------------------------------------------
// determine boundaries of attributes for normalization

initTask2();

initTask3();
