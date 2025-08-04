import { CheckCircle, Clock, Play, RefreshCw, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { authAPI, contactsAPI, groupsAPI, whatsappAPI } from '../lib/api';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
  data?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  isRunning: boolean;
}

const ApiTester: React.FC = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    { name: 'Authentication', tests: [], isRunning: false },
    { name: 'Devices', tests: [], isRunning: false },
    { name: 'Messages', tests: [], isRunning: false },
    { name: 'Contacts', tests: [], isRunning: false },
    { name: 'Groups', tests: [], isRunning: false },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [testUser] = useState({
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phoneNumber: '+1234567890',
    tenantName: 'Test Company'
  });

  const updateTestResult = (suiteName: string, testName: string, result: Partial<TestResult>) => {
    setTestSuites(prev => prev.map(suite => {
      if (suite.name === suiteName) {
        const updatedTests = suite.tests.map(test => 
          test.name === testName ? { ...test, ...result } : test
        );
        
        // Add test if it doesn't exist
        if (!updatedTests.find(test => test.name === testName)) {
          updatedTests.push({ name: testName, status: 'pending', ...result });
        }
        
        return { ...suite, tests: updatedTests };
      }
      return suite;
    }));
  };

  const setSuiteRunning = (suiteName: string, isRunning: boolean) => {
    setTestSuites(prev => prev.map(suite => 
      suite.name === suiteName ? { ...suite, isRunning } : suite
    ));
  };

  const runTest = async (suiteName: string, testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    updateTestResult(suiteName, testName, { status: 'pending' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(suiteName, testName, {
        status: 'success',
        message: 'Test passed',
        duration,
        data: result
      });
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(suiteName, testName, {
        status: 'error',
        message: error.message || 'Test failed',
        duration
      });
      return false;
    }
  };

  const runAuthTests = async () => {
    setSuiteRunning('Authentication', true);
    let authToken = '';

    // Test Registration
    await runTest('Authentication', 'User Registration', async () => {
      const result = await authAPI.register(testUser);
      if (!result.accessToken) throw new Error('No access token received');
      authToken = result.accessToken;
      localStorage.setItem('accessToken', authToken);
      return result;
    });

    // Test Login
    await runTest('Authentication', 'User Login', async () => {
      const result = await authAPI.login({
        email: testUser.email,
        password: testUser.password
      });
      if (!result.accessToken) throw new Error('No access token received');
      authToken = result.accessToken;
      localStorage.setItem('accessToken', authToken);
      return result;
    });

    // Test Get Profile
    await runTest('Authentication', 'Get Profile', async () => {
      const result = await authAPI.getProfile();
      if (!result.email) throw new Error('No user profile received');
      return result;
    });

    setSuiteRunning('Authentication', false);
  };

  const runDeviceTests = async () => {
    setSuiteRunning('Devices', true);
    let deviceId = '';

    // Test Create Device
    await runTest('Devices', 'Create Device', async () => {
      const result = await whatsappAPI.createDevice({
        name: 'Test Device',
        description: 'Test WhatsApp Device',
        isActive: true
      });
      if (!result.id) throw new Error('No device ID received');
      deviceId = result.id;
      return result;
    });

    // Test Get Devices
    await runTest('Devices', 'Get Devices', async () => {
      const result = await whatsappAPI.getDevices();
      if (!Array.isArray(result)) throw new Error('Expected array of devices');
      return result;
    });

    // Test Get Device by ID
    if (deviceId) {
      await runTest('Devices', 'Get Device by ID', async () => {
        const result = await whatsappAPI.getDevice(deviceId);
        if (result.id !== deviceId) throw new Error('Device ID mismatch');
        return result;
      });

      // Test Get Device Status
      await runTest('Devices', 'Get Device Status', async () => {
        const result = await whatsappAPI.getDeviceStatus(deviceId);
        if (!result.status) throw new Error('No status received');
        return result;
      });

      // Test Update Device
      await runTest('Devices', 'Update Device', async () => {
        const result = await whatsappAPI.updateDevice(deviceId, {
          name: 'Updated Test Device',
          description: 'Updated description'
        });
        if (result.name !== 'Updated Test Device') throw new Error('Device not updated');
        return result;
      });

      // Test Delete Device (cleanup)
      await runTest('Devices', 'Delete Device', async () => {
        const result = await whatsappAPI.deleteDevice(deviceId);
        if (!result.message) throw new Error('No confirmation message');
        return result;
      });
    }

    setSuiteRunning('Devices', false);
  };

  const runMessageTests = async () => {
    setSuiteRunning('Messages', true);

    // Test Get Messages
    await runTest('Messages', 'Get Messages', async () => {
      const result = await whatsappAPI.getMessages();
      if (!result.messages || !Array.isArray(result.messages)) {
        throw new Error('Expected messages array');
      }
      return result;
    });

    // Test Get Message Stats
    await runTest('Messages', 'Get Message Stats', async () => {
      const result = await whatsappAPI.getMessageStats();
      return result;
    });

    setSuiteRunning('Messages', false);
  };

  const runContactTests = async () => {
    setSuiteRunning('Contacts', true);
    let contactId = '';

    // Test Create Contact
    await runTest('Contacts', 'Create Contact', async () => {
      const result = await contactsAPI.createContact({
        name: 'Test Contact',
        phoneNumber: '+1234567890',
        email: 'test@example.com',
        company: 'Test Company'
      });
      if (!result.id) throw new Error('No contact ID received');
      contactId = result.id;
      return result;
    });

    // Test Get Contacts
    await runTest('Contacts', 'Get Contacts', async () => {
      const result = await contactsAPI.getContacts();
      if (!Array.isArray(result)) throw new Error('Expected array of contacts');
      return result;
    });

    // Test Get Contact by ID
    if (contactId) {
      await runTest('Contacts', 'Get Contact by ID', async () => {
        const result = await contactsAPI.getContact(contactId);
        if (result.id !== contactId) throw new Error('Contact ID mismatch');
        return result;
      });

      // Test Update Contact
      await runTest('Contacts', 'Update Contact', async () => {
        const result = await contactsAPI.updateContact(contactId, {
          name: 'Updated Test Contact',
          company: 'Updated Company'
        });
        if (result.name !== 'Updated Test Contact') throw new Error('Contact not updated');
        return result;
      });

      // Test Delete Contact (cleanup)
      await runTest('Contacts', 'Delete Contact', async () => {
        const result = await contactsAPI.deleteContact(contactId);
        if (!result.message) throw new Error('No confirmation message');
        return result;
      });
    }

    setSuiteRunning('Contacts', false);
  };

  const runGroupTests = async () => {
    setSuiteRunning('Groups', true);
    let groupId = '';

    // Test Create Group
    await runTest('Groups', 'Create Group', async () => {
      const result = await groupsAPI.createGroup({
        name: 'Test Group',
        description: 'Test WhatsApp Group',
        participants: ['+1234567890']
      });
      if (!result.id) throw new Error('No group ID received');
      groupId = result.id;
      return result;
    });

    // Test Get Groups
    await runTest('Groups', 'Get Groups', async () => {
      const result = await groupsAPI.getGroups();
      if (!Array.isArray(result)) throw new Error('Expected array of groups');
      return result;
    });

    // Test Get Group by ID
    if (groupId) {
      await runTest('Groups', 'Get Group by ID', async () => {
        const result = await groupsAPI.getGroup(groupId);
        if (result.id !== groupId) throw new Error('Group ID mismatch');
        return result;
      });

      // Test Update Group
      await runTest('Groups', 'Update Group', async () => {
        const result = await groupsAPI.updateGroup(groupId, {
          name: 'Updated Test Group',
          description: 'Updated description'
        });
        if (result.name !== 'Updated Test Group') throw new Error('Group not updated');
        return result;
      });

      // Test Delete Group (cleanup)
      await runTest('Groups', 'Delete Group', async () => {
        const result = await groupsAPI.deleteGroup(groupId);
        if (!result.message) throw new Error('No confirmation message');
        return result;
      });
    }

    setSuiteRunning('Groups', false);
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    
    try {
      await runAuthTests();
      await runDeviceTests();
      await runMessageTests();
      await runContactTests();
      await runGroupTests();
    } catch (error) {
      console.error('Error running tests:', error);
    }
    
    setIsRunningAll(false);
  };

  const clearResults = () => {
    setTestSuites(prev => prev.map(suite => ({ ...suite, tests: [] })));
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      pending: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getSuiteStats = (tests: TestResult[]) => {
    const total = tests.length;
    const passed = tests.filter(t => t.status === 'success').length;
    const failed = tests.filter(t => t.status === 'error').length;
    const pending = tests.filter(t => t.status === 'pending').length;
    
    return { total, passed, failed, pending };
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Tester</h1>
        <p className="text-muted-foreground">
          Test all API endpoints to ensure they're working properly
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={runAllTests} 
          disabled={isRunningAll}
          className="flex items-center gap-2"
        >
          {isRunningAll ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run All Tests
        </Button>
        <Button variant="outline" onClick={clearResults}>
          Clear Results
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testSuites.map((suite) => {
              const stats = getSuiteStats(suite.tests);
              return (
                <Card key={suite.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      {suite.name}
                      {suite.isRunning && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {stats.total} tests • {stats.passed} passed • {stats.failed} failed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="outline">{stats.total} Total</Badge>
                      <Badge variant="default">{stats.passed} Passed</Badge>
                      <Badge variant="destructive">{stats.failed} Failed</Badge>
                      {stats.pending > 0 && (
                        <Badge variant="secondary">{stats.pending} Pending</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {testSuites.map((suite) => (
          <TabsContent key={suite.name.toLowerCase()} value={suite.name.toLowerCase()}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{suite.name} Tests</CardTitle>
                    <CardDescription>
                      Test results for {suite.name.toLowerCase()} API endpoints
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      switch (suite.name) {
                        case 'Authentication':
                          runAuthTests();
                          break;
                        case 'Devices':
                          runDeviceTests();
                          break;
                        case 'Messages':
                          runMessageTests();
                          break;
                        case 'Contacts':
                          runContactTests();
                          break;
                        case 'Groups':
                          runGroupTests();
                          break;
                      }
                    }}
                    disabled={suite.isRunning}
                    variant="outline"
                  >
                    {suite.isRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Tests
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {suite.tests.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No tests have been run yet. Click "Run Tests" to start.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {suite.tests.map((test, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="mt-0.5">
                            {getStatusIcon(test.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium">{test.name}</h4>
                              {getStatusBadge(test.status)}
                            </div>
                            {test.message && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {test.message}
                              </p>
                            )}
                            {test.duration && (
                              <p className="text-xs text-muted-foreground">
                                Duration: {test.duration}ms
                              </p>
                            )}
                            {test.data && test.status === 'success' && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                  View Response Data
                                </summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                  {JSON.stringify(test.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ApiTester;